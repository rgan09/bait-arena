import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { JudgeResult, Room } from "@/lib/types";
import { applyAction, finishTurn, startGame, type Clock } from "./machine";
import { TOTAL_TURNS } from "./config";

const T0 = Date.UTC(2026, 10, 14, 12, 0, 0);
const clock = (now = T0): Clock => ({ now, pickTopic: (ex) => (ex === "socks" ? "cereal" : "socks") });

function room(over: Partial<Room> = {}): Room {
  return {
    code: "ABCD", player_a: "alice", player_b: "bob", phase: "lobby", turn: 0, topic: null,
    bait: null, reply: null, ignored: false, phase_ends_at: null, score_a: 0, score_b: 0,
    last_turn: null, version: 0, created_at: "", updated_at: "", ...over,
  };
}

const judged: JudgeResult = {
  provocation: 8, plausibility: 7, brevity: 9, creativity: 6, composure: 3,
  took_the_bait: true, foul: false, foul_reason: null, roast_bait: "x", roast_reply: "y", source: "ai",
};

function apply(r: Room, patch: Partial<Room>): Room {
  return { ...r, ...patch, version: r.version + 1 };
}

describe("game engine", () => {
  it("starts when B joins", () => {
    const t = startGame(room(), clock());
    assert.equal(t.ok && t.patch.phase, "bait");
    assert.equal(t.ok && t.patch.topic, "socks");
  });

  it("only the baiter can bait, only the replier can reply", () => {
    const r = room({ phase: "bait" });
    assert.equal(applyAction(r, "b", { type: "post_bait", text: "hi" }, clock()).ok, false);
    const t = applyAction(r, "a", { type: "post_bait", text: "  water is overrated  " }, clock());
    assert.equal(t.ok && t.patch.bait, "water is overrated");
    const r2 = apply(r, t.ok ? t.patch : {});
    assert.equal(applyAction(r2, "a", { type: "post_reply", text: "no" }, clock()).ok, false);
    const t2 = applyAction(r2, "b", { type: "post_reply", text: "ok and?" }, clock());
    assert.equal(t2.ok && t2.patch.phase, "judging");
    assert.equal(t2.ok && t2.effects[0].type, "judge");
  });

  it("rejects early timeouts and accepts late ones", () => {
    const ends = new Date(T0 + 30_000).toISOString();
    const r = room({ phase: "reply", bait: "x", phase_ends_at: ends });
    assert.equal(applyAction(r, "a", { type: "timeout" }, clock(T0 + 1000)).ok, false);
    const t = applyAction(r, "a", { type: "timeout" }, clock(T0 + 31_000));
    assert.equal(t.ok && t.patch.ignored, true);
  });

  it("scores the right seats and swaps roles", () => {
    const r = room({ phase: "judging", turn: 0, topic: "socks", bait: "b", reply: "r" });
    const f = finishTurn(r, judged)!;
    // A baited: 8+7+9+6 + 10 bonus = 40. B replied: 3*4 = 12.
    assert.equal(f.patch.score_a, 40);
    assert.equal(f.patch.score_b, 12);
    const r2 = apply(r, f.patch);
    const n = applyAction(r2, "b", { type: "next" }, clock());
    assert.equal(n.ok && n.patch.turn, 1);
    assert.equal(n.ok && n.patch.topic, "socks"); // same round, same topic
    // Turn 1: B is now the baiter.
    const r3 = apply(r2, n.ok ? n.patch : {});
    assert.equal(applyAction(r3, "b", { type: "post_bait", text: "socks are a scam" }, clock()).ok, true);
  });

  it("fouls zero the baiter", () => {
    const r = room({ phase: "judging", turn: 1 });
    const f = finishTurn(r, { ...judged, foul: true })!;
    assert.equal(f.patch.score_b, 0); // B baited on turn 1
  });

  it("plays a full best-of-3 to the recap", () => {
    let r = apply(room(), (startGame(room(), clock()) as { patch: Partial<Room> }).patch);
    for (let i = 0; i < TOTAL_TURNS; i++) {
      const baiter = r.turn % 2 === 0 ? "a" : "b";
      const replier = baiter === "a" ? "b" : "a";
      r = apply(r, (applyAction(r, baiter, { type: "post_bait", text: "bait" }, clock()) as { patch: Partial<Room> }).patch);
      r = apply(r, (applyAction(r, replier, { type: "ignore" }, clock()) as { patch: Partial<Room> }).patch);
      r = apply(r, finishTurn(r, judged)!.patch);
      r = apply(r, (applyAction(r, "a", { type: "next" }, clock()) as { patch: Partial<Room> }).patch);
    }
    assert.equal(r.phase, "recap");
    assert.equal(applyAction(r, "a", { type: "next" }, clock()).ok, false);
  });

  it("spectators can't play", () => {
    assert.equal(applyAction(room({ phase: "bait" }), null, { type: "post_bait", text: "x" }, clock()).ok, false);
  });
});

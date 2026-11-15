import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { JudgeResult, Room } from "@/lib/types";
import { applyAction, finishTurn, startGame, type Clock } from "./machine";
import { TOTAL_TURNS, TIMERS } from "./config";
import { matchWinner, pointsFor } from "./scoring";
import { expectedScore, updateElo } from "./elo";
import { tierFor } from "@/lib/tiers";

const T0 = Date.UTC(2026, 10, 14, 12, 0, 0);
const clock = (now = T0): Clock => ({ now, pickTopic: (ex) => (ex === "food" ? "sports" : "food") });

function room(over: Partial<Room> = {}): Room {
  return {
    code: "ABCD", player_a: "alice", player_b: "bob", phase: "lobby", turn: 0, topic: null,
    bait: null, reply: null, ignored: false, phase_ends_at: null, score_a: 0, score_b: 0,
    last_turn: null, ...TIMERS.normal, player_a_id: "pa", player_b_id: "pb", elo_a: 1000, elo_b: 1000,
    winner: null, elo_result: null, rematch_code: null, version: 0, created_at: "", updated_at: "", ...over,
  };
}

const replied: JudgeResult = {
  bait: { provocation: 8, plausibility: 7, creativity: 6 },
  response: { composure: 3, ratio: 4, took_bait: true },
  roast: "x", roast_response: "y", flagged_bait: false, flagged_response: false, source: "ai",
};
const ignored: JudgeResult = { ...replied, response: null };

const apply = (r: Room, patch: Partial<Room>): Room => ({ ...r, ...patch, version: r.version + 1 });
const patchOf = (t: ReturnType<typeof applyAction>) => {
  assert.ok(t.ok, t.ok ? "" : t.message);
  return t.patch;
};

describe("scoring (plan section 3 + ratio)", () => {
  it("baiter gets the 3 sub-scores + 10 when the responder takes the bait", () => {
    assert.deepEqual(pointsFor(replied), { bait: 8 + 7 + 6 + 10, reply: 3 * 2 + 4 });
  });
  it("ignoring is safe (14) but a calm clever dunk beats it", () => {
    assert.equal(pointsFor(ignored).reply, 14);
    const dunk = { ...replied, response: { composure: 9, ratio: 9, took_bait: false } };
    assert.equal(pointsFor(dunk).reply, 27);
    assert.equal(pointsFor(dunk).bait, 21); // no bonus
  });
  it("a flagged post scores 0 for its author only", () => {
    assert.equal(pointsFor({ ...replied, flagged_bait: true }).bait, 0);
    const p = pointsFor({ ...replied, flagged_response: true });
    assert.equal(p.reply, 0);
    assert.equal(p.bait, 31);
  });
  it("ties break on total composure", () => {
    const turns = [
      { replier: "bob", result: { ...replied, response: { composure: 9, ratio: 0, took_bait: false } } },
      { replier: "alice", result: { ...replied, response: { composure: 2, ratio: 0, took_bait: false } } },
    ];
    assert.equal(matchWinner({ a: "alice", b: "bob" }, { a: 20, b: 20 }, turns), "b");
    assert.equal(matchWinner({ a: "alice", b: "bob" }, { a: 21, b: 20 }, turns), "a");
  });
});

describe("game engine", () => {
  it("starts on a category when B joins", () => {
    const p = patchOf(startGame(room(), clock()));
    assert.equal(p.phase, "bait");
    assert.equal(p.topic, "food");
  });

  it("uses the room's timers (quick mode)", () => {
    const r = room({ phase: "bait", ...TIMERS.quick });
    const p = patchOf(applyAction(r, "a", { type: "post_bait", text: "cereal is soup" }, clock()));
    assert.equal(new Date(p.phase_ends_at!).getTime() - T0, TIMERS.quick.reply_seconds * 1000);
  });

  it("only the baiter can bait, only the responder can reply", () => {
    const r = room({ phase: "bait" });
    assert.equal(applyAction(r, "b", { type: "post_bait", text: "hi" }, clock()).ok, false);
    const r2 = apply(r, patchOf(applyAction(r, "a", { type: "post_bait", text: "  dark mode is overrated  " }, clock())));
    assert.equal(r2.bait, "dark mode is overrated");
    assert.equal(applyAction(r2, "a", { type: "post_reply", text: "no" }, clock()).ok, false);
    const t = applyAction(r2, "b", { type: "post_reply", text: "ok and?" }, clock());
    assert.ok(t.ok && t.effects[0].type === "judge");
  });

  it("rejects early timeouts and accepts late ones", () => {
    const r = room({ phase: "reply", bait: "x", phase_ends_at: new Date(T0 + 30_000).toISOString() });
    assert.equal(applyAction(r, "a", { type: "timeout" }, clock(T0 + 1000)).ok, false);
    assert.equal(patchOf(applyAction(r, "a", { type: "timeout" }, clock(T0 + 31_000))).ignored, true);
  });

  it("reveal auto-advances, swaps roles and draws a new category", () => {
    const r = room({ phase: "judging", turn: 0, topic: "food", bait: "b", reply: "r" });
    const f = finishTurn(r, replied, T0)!;
    assert.equal(f.patch.score_a, 31); // A baited
    assert.equal(f.patch.score_b, 10); // B replied: 3*2 + 4
    const r2 = apply(r, f.patch);
    assert.equal(applyAction(r2, "a", { type: "timeout" }, clock(T0 + 1000)).ok, false); // too early
    const p = patchOf(applyAction(r2, null, { type: "timeout" }, clock(T0 + 13_000))); // spectator nudge is fine
    assert.equal(p.turn, 1);
    assert.equal(p.topic, "sports");
    const r3 = apply(r2, p);
    assert.equal(applyAction(r3, "b", { type: "post_bait", text: "golf is a walk with homework" }, clock()).ok, true);
  });

  it(`plays a full ${TOTAL_TURNS}-round match to the recap`, () => {
    let r = apply(room(), patchOf(startGame(room(), clock())));
    for (let i = 0; i < TOTAL_TURNS; i++) {
      const baiter = r.turn % 2 === 0 ? "a" : "b";
      const responder = baiter === "a" ? "b" : "a";
      r = apply(r, patchOf(applyAction(r, baiter, { type: "post_bait", text: "bait" }, clock())));
      r = apply(r, patchOf(applyAction(r, responder, { type: "ignore" }, clock())));
      r = apply(r, finishTurn(r, ignored, T0)!.patch);
      r = apply(r, patchOf(applyAction(r, "a", { type: "next" }, clock())));
    }
    assert.equal(r.phase, "recap");
    assert.equal(r.score_a, r.score_b); // symmetric match
  });

  it("spectators can't play or skip", () => {
    assert.equal(applyAction(room({ phase: "bait" }), null, { type: "post_bait", text: "x" }, clock()).ok, false);
    assert.equal(applyAction(room({ phase: "result" }), null, { type: "next" }, clock()).ok, false);
  });
});

describe("elo + tiers", () => {
  it("equal players swap 16 points (K=32)", () => {
    assert.deepEqual(updateElo(1000, 1000, 1), { a: 1016, b: 984 });
    assert.deepEqual(updateElo(1000, 1000, 0.5), { a: 1000, b: 1000 });
  });
  it("beating a stronger player pays more", () => {
    assert.ok(expectedScore(1000, 1200) < 0.25);
    const r = updateElo(1000, 1200, 1);
    assert.equal(r.a - 1000, 1200 - r.b); // zero-sum
    assert.ok(r.a - 1000 > 16);
  });
  it("maps Elo to the plan's tiers", () => {
    assert.equal(tierFor(850).name, "Grass Toucher");
    assert.equal(tierFor(900).name, "Lurker");
    assert.equal(tierFor(1000).name, "Reply Guy");
    assert.equal(tierFor(1199).name, "Quote Tweeter");
    assert.equal(tierFor(1250).name, "Ratio Lord");
    assert.equal(tierFor(1300).name, "Chronically Online 👑");
  });
});

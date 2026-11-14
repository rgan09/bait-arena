// The game engine: pure rules, no database, no AI, no network.
// Given the current room + an action, it returns either a patch to apply or a reason it's not allowed.
//
//   lobby → bait (45s) → reply (30s) → judging → result → [next turn …] → recap

import type { Action, JudgeResult, Room, Seat, TurnRecord } from "@/lib/types";
import { GAME, TOTAL_TURNS } from "./config";
import { pointsFor } from "./scoring";

export interface Clock {
  now: number; // ms since epoch
  pickTopic: (exclude?: string | null) => string;
}

export type Effect = { type: "judge"; forceFallback?: boolean };

export type Transition =
  | { ok: true; patch: Partial<Room>; effects: Effect[] }
  | { ok: false; status: number; code: string; message: string };

// ---------- helpers ----------

export const baiterSeat = (turn: number): Seat => (turn % 2 === 0 ? "a" : "b");
export const replierSeat = (turn: number): Seat => (turn % 2 === 0 ? "b" : "a");
export const roundOf = (turn: number) => Math.floor(turn / 2) + 1;
export const nameOf = (room: Room, seat: Seat) => (seat === "a" ? room.player_a : room.player_b ?? "???");

const at = (ms: number) => new Date(ms).toISOString();
const fail = (status: number, code: string, message: string): Transition => ({ ok: false, status, code, message });
const clean = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, GAME.MAX_POST_CHARS);

function expired(room: Room, now: number) {
  if (!room.phase_ends_at) return false;
  return now >= new Date(room.phase_ends_at).getTime() - GAME.TIMEOUT_GRACE_MS;
}

const goJudging = (now: number, patch: Partial<Room>): Transition => ({
  ok: true,
  patch: { ...patch, phase: "judging", phase_ends_at: at(now + GAME.JUDGING_TIMEOUT_SECONDS * 1000) },
  effects: [{ type: "judge" }],
});

// ---------- transitions ----------

/** Player B joined: start turn 0. */
export function startGame(room: Room, clock: Clock): Transition {
  if (room.phase !== "lobby") return fail(409, "already_started", "This game already started.");
  if (!room.player_b) return fail(409, "no_opponent", "Waiting for an opponent.");
  return {
    ok: true,
    patch: {
      phase: "bait",
      turn: 0,
      topic: clock.pickTopic(null),
      bait: null,
      reply: null,
      ignored: false,
      phase_ends_at: at(clock.now + (GAME.START_DELAY_SECONDS + GAME.BAIT_SECONDS) * 1000),
    },
    effects: [],
  };
}

/** A player (or a timer) did something. `seat` is null for spectators. */
export function applyAction(room: Room, seat: Seat | null, action: Action, clock: Clock): Transition {
  const { now } = clock;
  const isBaiter = seat === baiterSeat(room.turn);
  const isReplier = seat === replierSeat(room.turn);

  if (seat === null && action.type !== "timeout") return fail(403, "spectator", "Spectators can't play.");

  switch (room.phase) {
    case "lobby":
      return fail(409, "not_started", "The game hasn't started yet.");

    case "bait": {
      if (action.type === "post_bait") {
        if (!isBaiter) return fail(403, "not_your_turn", "It's not your turn to bait.");
        const bait = clean(action.text);
        if (!bait) return fail(400, "empty", "Write something first.");
        return {
          ok: true,
          patch: { bait, phase: "reply", phase_ends_at: at(now + GAME.REPLY_SECONDS * 1000) },
          effects: [],
        };
      }
      if (action.type === "timeout") {
        if (!expired(room, now)) return fail(409, "too_early", "Time isn't up yet.");
        // Baiter posted nothing: skip the reply phase, judge an empty bait (scores 0).
        return goJudging(now, { bait: "", reply: null, ignored: true });
      }
      return fail(409, "wrong_phase", "Waiting for the bait.");
    }

    case "reply": {
      if (action.type === "post_reply") {
        if (!isReplier) return fail(403, "not_your_turn", "It's not your turn to reply.");
        const reply = clean(action.text);
        if (!reply) return fail(400, "empty", "Write something, or hit Ignore.");
        return goJudging(now, { reply, ignored: false });
      }
      if (action.type === "ignore") {
        if (!isReplier) return fail(403, "not_your_turn", "It's not your turn to reply.");
        return goJudging(now, { reply: null, ignored: true });
      }
      if (action.type === "timeout") {
        if (!expired(room, now)) return fail(409, "too_early", "Time isn't up yet.");
        return goJudging(now, { reply: null, ignored: true }); // silence = ignore
      }
      return fail(409, "wrong_phase", "Waiting for the reply.");
    }

    case "judging": {
      if (action.type === "timeout") {
        if (!expired(room, now)) return fail(409, "too_early", "The judge is still thinking.");
        return { ok: true, patch: {}, effects: [{ type: "judge", forceFallback: true }] };
      }
      return fail(409, "wrong_phase", "The judge is thinking.");
    }

    case "result": {
      if (action.type !== "next") return fail(409, "wrong_phase", "Hit Next to continue.");
      return nextTurn(room, clock);
    }

    case "recap":
      return fail(409, "game_over", "This game is over.");
  }
}

/** The judge came back: score the turn and show the result. */
export function finishTurn(room: Room, result: JudgeResult): { patch: Partial<Room>; record: TurnRecord } | null {
  if (room.phase !== "judging") return null;
  const pts = pointsFor(result);
  const baiter = baiterSeat(room.turn);
  const record: TurnRecord = {
    room_code: room.code,
    turn: room.turn,
    round: roundOf(room.turn),
    topic: room.topic ?? "",
    baiter: nameOf(room, baiter),
    replier: nameOf(room, replierSeat(room.turn)),
    bait: room.bait ?? "",
    reply: room.ignored ? null : room.reply,
    ignored: room.ignored,
    result,
    bait_points: pts.bait,
    reply_points: pts.reply,
  };
  const scoreA = room.score_a + (baiter === "a" ? pts.bait : pts.reply);
  const scoreB = room.score_b + (baiter === "b" ? pts.bait : pts.reply);
  return {
    record,
    patch: { phase: "result", phase_ends_at: null, last_turn: record, score_a: scoreA, score_b: scoreB },
  };
}

function nextTurn(room: Room, clock: Clock): Transition {
  const next = room.turn + 1;
  if (next >= TOTAL_TURNS) {
    return { ok: true, patch: { phase: "recap", phase_ends_at: null }, effects: [] };
  }
  // Same topic for both turns of a round; new topic when a new round starts.
  const topic = next % 2 === 0 ? clock.pickTopic(room.topic) : room.topic;
  return {
    ok: true,
    patch: {
      turn: next,
      topic,
      bait: null,
      reply: null,
      ignored: false,
      phase: "bait",
      phase_ends_at: at(clock.now + GAME.BAIT_SECONDS * 1000),
    },
    effects: [],
  };
}

export function winnerOf(room: Room): Seat | "tie" {
  if (room.score_a === room.score_b) return "tie";
  return room.score_a > room.score_b ? "a" : "b";
}

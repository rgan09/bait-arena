// Shared shapes used by every layer (engine, db, ai, api, ui).
// Change these carefully: everything else depends on them.

export type Phase = "lobby" | "bait" | "reply" | "judging" | "result" | "recap";
export type Seat = "a" | "b";

/** What the judge returns for one turn. All scores are integers 0–10. */
export interface JudgeResult {
  provocation: number; // would people reply?
  plausibility: number; // sounds sincere, not obvious trolling
  brevity: number; // short bait hits harder
  creativity: number; // fresh angle
  composure: number; // how unbothered the reply was
  took_the_bait: boolean; // the replier got visibly heated
  foul: boolean; // slurs / attacks on real people or groups
  foul_reason: string | null;
  roast_bait: string; // one-line roast of the bait
  roast_reply: string; // one-line roast of the reply
  source: "ai" | "fallback"; // fallback = AI was slow / rate-limited
}

/** One finished turn, as stored in the `turns` table. */
export interface TurnRecord {
  room_code: string;
  turn: number;
  round: number;
  topic: string;
  baiter: string;
  replier: string;
  bait: string;
  reply: string | null; // null when ignored
  ignored: boolean;
  result: JudgeResult;
  bait_points: number;
  reply_points: number;
}

/** Public room state (the `rooms` table). Safe for anyone in the room to read. */
export interface Room {
  code: string;
  player_a: string;
  player_b: string | null;
  phase: Phase;
  turn: number; // 0-based; 2 turns per round
  topic: string | null;
  bait: string | null;
  reply: string | null;
  ignored: boolean;
  phase_ends_at: string | null; // ISO timestamp the current phase ends
  score_a: number;
  score_b: number;
  last_turn: TurnRecord | null;
  version: number; // optimistic-locking counter
  created_at: string;
  updated_at: string;
}

/** Everything a player can do, sent to POST /api/v1/rooms/:code/actions */
export type Action =
  | { type: "post_bait"; text: string }
  | { type: "post_reply"; text: string }
  | { type: "ignore" }
  | { type: "timeout" }
  | { type: "next" };

/** Stored per-room on the client after create/join. */
export interface PlayerSession {
  code: string;
  seat: Seat;
  name: string;
  token: string;
}

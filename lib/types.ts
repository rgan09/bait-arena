// Shared shapes used by every layer (engine, db, ai, api, ui) and by BOTH teammates.
// The judge contract (JudgeRequest / JudgeResult) follows plan section 4, extended with
// `ratio` and `roast_response` for the hot-take battle. Change it only after telling each other.

// ===================== AI judge contract (Person B owns the implementation) =====================

/** POST /api/judge — used by battles and Zen Mode. */
export type JudgeRequest = {
  topic: string; // category label + prompt, e.g. "Food crimes — A food opinion that would start a war"
  bait: string;
  response: string | null; // null = ignored
};

export type JudgeResult = {
  bait: { provocation: number; plausibility: number; creativity: number }; // 0–10 each
  /** null when the responder ignored the bait. */
  response: {
    composure: number; // 0–10: how unbothered the reply is
    ratio: number; // 0–10: how hard the reply "won" the exchange (calm, clever dunk = high)
    took_bait: boolean; // reply is heated, defensive or over-explaining
  } | null;
  roast: string; // one line roasting the bait, max ~120 chars
  roast_response: string | null; // one line roasting the reply (or the silence)
  flagged_bait: boolean; // slurs, attacks on real people/groups, threats, sexual content
  flagged_response: boolean;
  source: "ai" | "fallback"; // fallback = AI slow / rate-limited / unavailable
};

// POST /api/judge-bait — Bait School (Person B)
export type JudgeBaitRequest = { topic: string; bait: string };
export type JudgeBaitResult = {
  provocation: number;
  plausibility: number;
  creativity: number;
  roast: string;
  flagged: boolean;
};

// POST /api/generate-bait — Zen Mode (Person B)
export type GenerateBaitRequest = { topic: string; difficulty: 1 | 2 | 3 };
export type GenerateBaitResult = { bait: string };

// POST /api/fake-replies — comment section (Person B)
export type FakeRepliesRequest = { bait: string; score: number }; // score 0–30
export type FakeRepliesResult = { replies: { username: string; text: string; likes: number }[] };

// ===================== Battle (Person A) =====================

export type Phase = "lobby" | "bait" | "reply" | "judging" | "result" | "recap";
export type Seat = "a" | "b";

/** One finished round, as stored in the `turns` table. */
export interface TurnRecord {
  room_code: string;
  turn: number; // 0-based round index
  round: number; // 1-based, for display
  topic: string; // category id (see lib/categories.ts)
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
  turn: number; // 0-based round index; player A baits on even rounds
  topic: string | null; // category id for the current round
  bait: string | null;
  reply: string | null;
  ignored: boolean;
  phase_ends_at: string | null; // ISO timestamp the current phase ends
  score_a: number;
  score_b: number;
  last_turn: TurnRecord | null;
  bait_seconds: number;
  reply_seconds: number;
  reveal_seconds: number;
  player_a_id: string | null; // public player ids (NOT secret; tokens are server-only)
  player_b_id: string | null;
  elo_a: number | null; // Elo when the match started (for tier badges)
  elo_b: number | null;
  winner: Seat | "tie" | null; // set when the match finishes
  elo_result: EloResult | null; // Elo change, set when the match finishes
  rematch_code: string | null; // set when someone hits Rematch
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

// ===================== Players & ranked (Person A) =====================

/** Public player profile (never includes the secret token). */
export interface Player {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
}

/** What the client keeps in localStorage after picking a username. */
export interface StoredPlayer {
  id: string;
  username: string;
  token: string; // secret: sent as `Authorization: Bearer <token>`
}

export interface EloChange {
  before: number;
  after: number;
}
export type EloResult = { a: EloChange; b: EloChange };

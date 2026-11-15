// Zen Mode: solo training against AI-written ragebait. No rooms, no accounts, no database.
// The goal is a CALM reply. Ignoring is allowed but costs points, because it isn't practice.
// Shared by the server (api/zen/*) and the /zen page.

export const ZEN = {
  LIVES: 3,
  REPLY_SECONDS: 30,
  IGNORE_PENALTY: 10, // ignoring (or letting the timer run out with nothing typed) costs this many points
  MAX_REPLY_CHARS: 280,
} as const;

export type ZenDifficulty = 1 | 2 | 3;

/** Baits 1–3 are easy, 4–6 medium, then hard. `index` is 0-based. */
export function difficultyFor(index: number): ZenDifficulty {
  if (index < 3) return 1;
  if (index < 6) return 2;
  return 3;
}

export const DIFFICULTY_LABEL: Record<ZenDifficulty, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

/** One AI-written bait for the trainee to respond to. */
export interface ZenBait {
  category: string; // category id (lib/categories.ts)
  difficulty: ZenDifficulty;
  bait: string;
  source: "ai" | "fallback";
}

/** The coach's verdict on one response. */
export interface ZenCoach {
  /** null when the trainee ignored the bait. */
  response: { composure: number; ratio: number; took_bait: boolean } | null; // scores 0–10
  flagged_response: boolean; // slurs / attacks / threats in the reply
  hook: string; // the bait technique, e.g. "False binary"
  verdict: string; // one-line honest (funny) read of the reply
  tip: string; // one actionable line
  better_reply: string; // an example calm, clever reply
  source: "ai" | "fallback";
}

export type ZenOutcome = "calm" | "took_bait" | "ignored" | "flagged";

/**
 * Scoring for one bait:
 *   calm reply → composure × 2 + ratio (0–30)
 *   took the bait → 0 points, lose a life
 *   flagged reply → 0 points, lose a life
 *   ignored → −IGNORE_PENALTY points (no life lost; it's safe, just not the skill we're training)
 */
export function zenPoints(c: Pick<ZenCoach, "response" | "flagged_response">): {
  points: number;
  lifeLost: boolean;
  outcome: ZenOutcome;
} {
  if (c.flagged_response) return { points: 0, lifeLost: true, outcome: "flagged" };
  if (!c.response) return { points: -ZEN.IGNORE_PENALTY, lifeLost: false, outcome: "ignored" };
  if (c.response.took_bait) return { points: 0, lifeLost: true, outcome: "took_bait" };
  return { points: c.response.composure * 2 + c.response.ratio, lifeLost: false, outcome: "calm" };
}

/** Running total never drops below zero. */
export const addPoints = (total: number, points: number) => Math.max(0, total + points);

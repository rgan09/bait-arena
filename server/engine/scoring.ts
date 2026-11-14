import type { JudgeResult } from "@/lib/types";

export const TOOK_THE_BAIT_BONUS = 10;

/**
 * Baiter: sum of the four bait scores (0–40), +10 if the opponent took the bait.
 * Replier: composure × 4 (0–40), so both roles can earn about the same.
 * A foul (slurs / attacks on real people) zeroes the baiter.
 */
export function pointsFor(r: JudgeResult): { bait: number; reply: number } {
  const bait = r.foul
    ? 0
    : r.provocation + r.plausibility + r.brevity + r.creativity + (r.took_the_bait ? TOOK_THE_BAIT_BONUS : 0);
  const reply = r.composure * 4;
  return { bait, reply };
}

/** Rank title for a single bait score — shown on the result card. */
export function baitVerdict(points: number): string {
  if (points >= 42) return "CHRONICALLY ONLINE 👑";
  if (points >= 34) return "Ratio Lord";
  if (points >= 26) return "Quote Tweeter";
  if (points >= 18) return "Reply Guy";
  if (points >= 10) return "Lurker";
  return "Grass Toucher";
}

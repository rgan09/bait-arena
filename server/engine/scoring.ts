import type { JudgeResult, TurnRecord } from "@/lib/types";

export const TOOK_THE_BAIT_BONUS = 10;
export const IGNORE_COMPOSURE_CAP = 7;

/**
 * Plan section 3, plus the hot-take "ratio":
 *   Baiter    = provocation + plausibility + creativity (max 30) + 10 if the responder took the bait
 *   Responder = composure × 2 + ratio (max 30). Ignoring = composure capped at 7, ratio 0 → 14:
 *               safe, but a calm, clever clap-back (e.g. 9×2 + 9 = 27) beats it.
 *   A flagged post scores 0 for whoever wrote it.
 */
export function pointsFor(r: JudgeResult): { bait: number; reply: number } {
  const bait = r.flagged_bait
    ? 0
    : r.bait.provocation + r.bait.plausibility + r.bait.creativity + (r.response?.took_bait ? TOOK_THE_BAIT_BONUS : 0);

  let reply: number;
  if (r.flagged_response) reply = 0;
  else if (!r.response) reply = IGNORE_COMPOSURE_CAP * 2;
  else reply = r.response.composure * 2 + r.response.ratio;

  return { bait, reply };
}

/** Composure used for the tie-break (ignored = the cap). */
export function composureOf(r: JudgeResult): number {
  if (r.flagged_response) return 0;
  return r.response ? r.response.composure : IGNORE_COMPOSURE_CAP;
}

/** Winner by total points; tie → higher total composure; still tied → "tie". */
export function matchWinner(
  players: { a: string; b: string },
  scores: { a: number; b: number },
  turns: Pick<TurnRecord, "replier" | "result">[],
): "a" | "b" | "tie" {
  if (scores.a !== scores.b) return scores.a > scores.b ? "a" : "b";
  const comp = (name: string) => turns.filter((t) => t.replier === name).reduce((s, t) => s + composureOf(t.result), 0);
  const ca = comp(players.a);
  const cb = comp(players.b);
  if (ca === cb) return "tie";
  return ca > cb ? "a" : "b";
}

/** Label for a single bait score (0–40). Deliberately NOT the Elo tier names. */
export function baitVerdict(points: number): string {
  if (points >= 30) return "Ragebait royalty 👑";
  if (points >= 22) return "Nuclear ☢️";
  if (points >= 15) return "Spicy 🌶️";
  if (points >= 8) return "Light simmer";
  return "Mid bait 🥱";
}

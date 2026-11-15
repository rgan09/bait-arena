// Bait School helpers shared by the hub and play pages (client-side, no AI).
import type { FakeReply } from "./types";

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const bestKey = (day: string) => `bait:school:best:${day}`;

export function loadDailyBest(day: string): number | null {
  try {
    const v = localStorage.getItem(bestKey(day));
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}

/** Saves if it beats today's best. Returns true for a new personal best. */
export function saveDailyBest(day: string, score: number): boolean {
  const prev = loadDailyBest(day);
  if (prev != null && prev >= score) return false;
  try { localStorage.setItem(bestKey(day), String(score)); } catch {}
  return true;
}

/** Score out of 30 → label. Deliberately not the Elo tier names. */
export function schoolVerdict(score: number): string {
  if (score >= 26) return "Ragebait royalty 👑";
  if (score >= 20) return "Nuclear ☢️";
  if (score >= 14) return "Spicy 🌶️";
  if (score >= 8) return "Light simmer";
  return "Mid bait 🥱";
}

/** Fake engagement for the post: everything grows (fast) with the score. */
export function engagement(score: number, replies: FakeReply[]) {
  const extraReplies = score >= 20 ? Math.round((score - 16) * 4 + Math.random() * 6) : score >= 14 ? Math.round(Math.random() * 4) : 0;
  return {
    replies: replies.length + extraReplies,
    extraReplies,
    quotes: score >= 14 ? Math.round((score - 12) * 1.8) : 0,
    likes: replies.reduce((s, r) => s + r.likes, 0) + Math.round(2 * Math.pow(1.22, score)),
    views: Math.round(40 * Math.pow(1.32, score)),
  };
}

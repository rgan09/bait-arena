import { TOPICS } from "./config";
import type { Clock } from "./machine";

export * from "./config";
export * from "./machine";
export * from "./scoring";

export function pickTopic(exclude?: string | null): string {
  const pool = TOPICS.filter((t) => t !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export const realClock = (): Clock => ({ now: Date.now(), pickTopic });

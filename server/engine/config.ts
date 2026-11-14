export const GAME = {
  /** Each player baits once per 2 rounds. Plan default = 2; use 4 if games feel short. */
  MATCH_ROUNDS: 2,
  JUDGING_TIMEOUT_SECONDS: 20, // if the AI hangs, anyone can force backup scoring after this
  START_DELAY_SECONDS: 3, // breathing room after the opponent joins
  MAX_POST_CHARS: 280,
  NAME_MAX_CHARS: 20,
  TIMEOUT_GRACE_MS: 1500, // clocks differ slightly between phones
} as const;

/** Timer presets, chosen per room at creation. "quick" keeps a full match near the 90s demo slot. */
export const TIMERS = {
  normal: { bait_seconds: 45, reply_seconds: 30, reveal_seconds: 12 },
  quick: { bait_seconds: 25, reply_seconds: 15, reveal_seconds: 8 },
} as const;
export type TimerPreset = keyof typeof TIMERS;

export const TOTAL_TURNS = GAME.MATCH_ROUNDS;

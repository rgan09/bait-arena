// The AI pipeline for one turn. Layers, in order:
//   1. Local moderation  — instant, free, no AI call
//   2. Gemini safety     — Google's own filter (surfaces as BlockedBySafety)
//   3. Gemini judge      — scores + took_the_bait + foul + roasts, in ONE call (free tier is tight)
//   4. Fallback          — if the AI is slow / rate-limited, the game still continues
//
// Next phase (streaming): roasts typing out live + the comment storm plug in after step 3.

import type { JudgeResult } from "@/lib/types";
import { BlockedBySafety, generateJson } from "./gemini";
import { moderate } from "./moderation";
import { JUDGE_SCHEMA, JUDGE_SYSTEM, judgeUserPrompt } from "./prompts";

export interface JudgeInput {
  topic: string;
  bait: string;
  reply: string | null;
  ignored: boolean;
}

const clamp = (n: unknown) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
const line = (s: unknown, fallback: string) =>
  typeof s === "string" && s.trim() ? s.trim().slice(0, 160) : fallback;

const EMPTY_BAIT_ROASTS = [
  "Posted nothing. The ultimate bait is no bait. Zero points though.",
  "Stared at the keyboard for 45 seconds and chose peace.",
  "Silence. Bold. Scoreless.",
];
const FALLBACK_ROASTS = [
  "The judge rage-quit. Have some participation points.",
  "Judge is touching grass right now. Scores are vibes-based.",
  "AI judge got ratioed by its own rate limit.",
];
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

function foulResult(reason: string, ignored: boolean): JudgeResult {
  return {
    provocation: 0, plausibility: 0, brevity: 0, creativity: 0,
    composure: ignored ? 7 : 6, took_the_bait: false,
    foul: true, foul_reason: reason,
    roast_bait: "🚩 FOUL. Bait the topic, not the person.",
    roast_reply: ignored ? "Correctly ignored. Touch grass award." : "Didn't stoop to that level.",
    source: "ai",
  };
}

export function fallbackResult(input: JudgeInput): JudgeResult {
  if (!input.bait.trim()) {
    return {
      provocation: 0, plausibility: 0, brevity: 0, creativity: 0, composure: 7,
      took_the_bait: false, foul: false, foul_reason: null,
      roast_bait: pick(EMPTY_BAIT_ROASTS), roast_reply: "Nothing to reply to. Peaceful.", source: "fallback",
    };
  }
  // Rough heuristics so the fallback still feels fair.
  const len = input.bait.length;
  const reply = input.reply ?? "";
  const heated = !input.ignored && (reply.length > 140 || /[A-Z]{6,}|!!|actually/i.test(reply));
  return {
    provocation: 5, plausibility: 5, brevity: len < 60 ? 8 : len < 140 ? 6 : 3, creativity: 5,
    composure: input.ignored ? 7 : heated ? 3 : 6, took_the_bait: heated,
    foul: false, foul_reason: null,
    roast_bait: pick(FALLBACK_ROASTS), roast_reply: heated ? "Typed with their whole chest." : "Unbothered. Moisturized.",
    source: "fallback",
  };
}

export async function runJudging(input: JudgeInput, opts: { forceFallback?: boolean } = {}): Promise<JudgeResult> {
  if (opts.forceFallback || !input.bait.trim()) return fallbackResult(input);

  // Layer 1: local moderation.
  const baitCheck = moderate(input.bait);
  if (baitCheck.foul) return foulResult(baitCheck.reason!, input.ignored);
  const replyFoul = moderate(input.reply).foul;

  // Layers 2 + 3: Gemini.
  try {
    const raw = await generateJson<Record<string, unknown>>({
      system: JUDGE_SYSTEM,
      user: judgeUserPrompt(input),
      schema: JUDGE_SCHEMA,
    });
    const foul = raw.foul === true;
    const result: JudgeResult = {
      provocation: foul ? 0 : clamp(raw.provocation),
      plausibility: foul ? 0 : clamp(raw.plausibility),
      brevity: foul ? 0 : clamp(raw.brevity),
      creativity: foul ? 0 : clamp(raw.creativity),
      composure: replyFoul ? 0 : input.ignored ? 7 : clamp(raw.composure),
      took_the_bait: !input.ignored && raw.took_the_bait === true,
      foul,
      foul_reason: foul ? line(raw.foul_reason, "Bait the topic, not the person.") : null,
      roast_bait: line(raw.roast_bait, "No notes. Literally none."),
      roast_reply: line(raw.roast_reply, input.ignored ? "Scrolled past like a pro." : "Okay."),
      source: "ai",
    };
    return result;
  } catch (err) {
    if (err instanceof BlockedBySafety) return foulResult("Blocked by the safety filter.", input.ignored);
    console.error("[judge] falling back:", err);
    return fallbackResult(input);
  }
}

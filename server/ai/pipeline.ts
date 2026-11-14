// The judge — implements the JudgeRequest → JudgeResult contract in lib/types.ts.
// Person B can tune the prompt (prompts.ts) or swap internals freely; callers only depend on `judge()`.
//
// Layers, in order:
//   1. Local moderation  — instant, free, no AI call
//   2. Gemini safety     — Google's own filter (surfaces as BlockedBySafety)
//   3. Gemini judge      — all scores + flags + both roasts in ONE call (free tier is tight)
//   4. Fallback          — if the AI is slow / rate-limited, the game still continues

import { isInspoCopy } from "@/lib/categories";
import type { JudgeRequest, JudgeResult } from "@/lib/types";
import { BlockedBySafety, generateJson } from "./gemini";
import { moderate } from "./moderation";
import { JUDGE_SCHEMA, JUDGE_SYSTEM, judgeUserPrompt } from "./prompts";

const clamp = (n: unknown) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
const line = (s: unknown, fallback: string) =>
  typeof s === "string" && s.trim() ? s.trim().slice(0, 160) : fallback;
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

const EMPTY_BAIT_ROASTS = [
  "Posted nothing. The ultimate bait is no bait. Zero points though.",
  "Stared at the keyboard and chose peace.",
  "Silence. Bold. Scoreless.",
];
const FALLBACK_ROASTS = [
  "The judge rage-quit. Have some participation points.",
  "Judge is touching grass right now. Scores are vibes-based.",
  "AI judge got ratioed by its own rate limit.",
];

function heated(text: string) {
  return text.length > 160 || /[A-Z]{6,}|!!|\bactually\b|\bliterally\b/.test(text);
}

/** Never throws; used when the AI is unavailable, slow, or the bait is empty. */
export function fallbackJudge(req: JudgeRequest): JudgeResult {
  const ignored = req.response === null;
  if (!req.bait.trim()) {
    return {
      bait: { provocation: 0, plausibility: 0, creativity: 0 },
      response: ignored ? null : { composure: 7, ratio: 2, took_bait: false },
      roast: pick(EMPTY_BAIT_ROASTS),
      roast_response: "Nothing to reply to. Peaceful.",
      flagged_bait: false, flagged_response: false, source: "fallback",
    };
  }
  const hot = !ignored && heated(req.response!);
  return {
    bait: { provocation: 5, plausibility: 5, creativity: isInspoCopy(req.bait) ? 2 : 5 },
    response: ignored ? null : { composure: hot ? 3 : 6, ratio: hot ? 2 : 5, took_bait: hot },
    roast: pick(FALLBACK_ROASTS),
    roast_response: ignored ? "Scrolled past. Unbothered." : hot ? "Typed with their whole chest." : "Unbothered. Moisturized.",
    flagged_bait: false, flagged_response: false, source: "fallback",
  };
}

export async function judge(req: JudgeRequest, opts: { forceFallback?: boolean } = {}): Promise<JudgeResult> {
  if (opts.forceFallback || !req.bait.trim()) return fallbackJudge(req);
  const ignored = req.response === null;

  // Layer 1: local moderation.
  const baitFlag = moderate(req.bait).foul;
  const respFlag = !ignored && moderate(req.response).foul;
  if (baitFlag) {
    return {
      bait: { provocation: 0, plausibility: 0, creativity: 0 },
      response: ignored ? null : { composure: respFlag ? 0 : 8, ratio: 5, took_bait: false },
      roast: "🚩 Foul. Bait the topic, not the person.",
      roast_response: ignored ? "Correctly ignored. Touch-grass award." : "Didn't stoop to that level.",
      flagged_bait: true, flagged_response: respFlag, source: "ai",
    };
  }

  // Layers 2 + 3: Gemini.
  try {
    const raw = await generateJson<Record<string, unknown>>({
      system: JUDGE_SYSTEM,
      user: judgeUserPrompt(req),
      schema: JUDGE_SCHEMA,
    });
    const flaggedBait = raw.flagged_bait === true;
    const flaggedResp = respFlag || (!ignored && raw.flagged_response === true);
    return {
      bait: flaggedBait
        ? { provocation: 0, plausibility: 0, creativity: 0 }
        : {
            provocation: clamp(raw.provocation),
            plausibility: clamp(raw.plausibility),
            // Copying an Inspo take word-for-word isn't creative.
            creativity: isInspoCopy(req.bait) ? Math.min(2, clamp(raw.creativity)) : clamp(raw.creativity),
          },
      response: ignored
        ? null
        : {
            composure: flaggedResp ? 0 : clamp(raw.composure),
            ratio: flaggedResp ? 0 : clamp(raw.ratio),
            took_bait: raw.took_bait === true,
          },
      roast: line(raw.roast, flaggedBait ? "🚩 Foul. Bait the topic, not the person." : "No notes. Literally none."),
      roast_response: line(raw.roast_response, ignored ? "Scrolled past like a pro." : "Okay."),
      flagged_bait: flaggedBait,
      flagged_response: flaggedResp,
      source: "ai",
    };
  } catch (err) {
    if (err instanceof BlockedBySafety) {
      const r = fallbackJudge(req);
      return { ...r, bait: { provocation: 0, plausibility: 0, creativity: 0 }, flagged_bait: true, roast: "🚩 Blocked by the safety filter.", source: "ai" };
    }
    console.error("[judge] falling back:", err);
    return fallbackJudge(req);
  }
}

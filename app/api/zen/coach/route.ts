// POST /api/zen/coach — coaches one Zen response and returns the next bait (one AI call).
// Body: { category, difficulty, bait, response: string | null, next_category, next_difficulty }
//   → { coach: ZenCoach, next: ZenBait }
import { z } from "zod";
import { CATEGORY_IDS } from "@/lib/categories";
import type { ZenDifficulty } from "@/lib/zen";
import { coachZen } from "@/server/ai/zen";
import { handle, ok, parseBody, rateLimit } from "@/server/http";

export const maxDuration = 30;

const Category = z.enum(CATEGORY_IDS as [string, ...string[]]);
const Difficulty = z.number().int().min(1).max(3);

const Body = z.object({
  category: Category,
  difficulty: Difficulty,
  bait: z.string().trim().min(1).max(300),
  response: z.string().max(2000).nullable(),
  next_category: Category,
  next_difficulty: Difficulty,
});

export const POST = handle(async (req: Request) => {
  rateLimit(req, "zen-coach", 10, 60_000);
  const b = await parseBody(req, Body);
  return ok(
    await coachZen({
      ...b,
      difficulty: b.difficulty as ZenDifficulty,
      next_difficulty: b.next_difficulty as ZenDifficulty,
    }),
  );
});

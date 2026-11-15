// POST /api/zen/bait — first bait of a Zen run. Later baits come back from /api/zen/coach.
// Body: { category?: string, difficulty: 1 | 2 | 3 } → ZenBait
import { z } from "zod";
import { CATEGORY_IDS, randomCategoryId } from "@/lib/categories";
import type { ZenDifficulty } from "@/lib/zen";
import { generateZenBait } from "@/server/ai/zen";
import { handle, ok, parseBody, rateLimit } from "@/server/http";

export const maxDuration = 30;

const Body = z.object({
  category: z.enum(CATEGORY_IDS as [string, ...string[]]).optional(),
  difficulty: z.number().int().min(1).max(3),
});

export const POST = handle(async (req: Request) => {
  rateLimit(req, "zen-bait", 6, 60_000);
  const { category, difficulty } = await parseBody(req, Body);
  return ok(await generateZenBait(category ?? randomCategoryId(), difficulty as ZenDifficulty));
});

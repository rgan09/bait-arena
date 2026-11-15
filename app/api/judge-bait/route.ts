// POST /api/judge-bait — plan contract: JudgeBaitRequest { topic, bait } → JudgeBaitResult
import { judgeBait } from "@/server/ai/school";
import { handle, ok, parseBody, rateLimit } from "@/server/http";
import { JudgeBaitBody } from "@/server/schemas";

export const maxDuration = 30;

export const POST = handle(async (req: Request) => {
  rateLimit(req, "judge-bait", 6, 60_000);
  const { topic, bait } = await parseBody(req, JudgeBaitBody);
  return ok(await judgeBait(topic, bait));
});

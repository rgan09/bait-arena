// POST /api/judge — the shared judge endpoint from the plan (section 4).
// Body: JudgeRequest { topic, bait, response | null } → JudgeResult
// Battles call judge() directly on the server; this endpoint is for Zen Mode / Bait School / testing.
import { judge } from "@/server/ai/pipeline";
import { handle, ok, parseBody, rateLimit } from "@/server/http";
import { JudgeRequestBody } from "@/server/schemas";

export const maxDuration = 30;

export const POST = handle(async (req: Request) => {
  rateLimit(req, "judge", 6, 60_000); // Gemini free tier is ~10 requests/minute for the whole app
  const body = await parseBody(req, JudgeRequestBody);
  return ok(await judge(body));
});

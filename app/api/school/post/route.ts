// POST /api/school/post — Bait School: SchoolPostRequest → SchoolPostResult
// Grades the bait AND writes the comment section in ONE AI call (saves the Gemini free tier).
import { judgeBaitWithReplies } from "@/server/ai/school";
import { handle, ok, parseBody, rateLimit } from "@/server/http";
import { SchoolPostBody } from "@/server/schemas";

export const maxDuration = 30;

export const POST = handle(async (req: Request) => {
  rateLimit(req, "school", 6, 60_000);
  const body = await parseBody(req, SchoolPostBody);
  return ok(await judgeBaitWithReplies({ ...body, technique: body.technique ?? null }));
});

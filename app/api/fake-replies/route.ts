// POST /api/fake-replies — plan contract: FakeRepliesRequest { bait, score } → FakeRepliesResult
import { fakeReplies } from "@/server/ai/school";
import { handle, ok, parseBody, rateLimit } from "@/server/http";
import { FakeRepliesBody } from "@/server/schemas";

export const maxDuration = 30;

export const POST = handle(async (req: Request) => {
  rateLimit(req, "fake-replies", 6, 60_000);
  const { bait, score } = await parseBody(req, FakeRepliesBody);
  return ok({ replies: await fakeReplies(bait, score) });
});

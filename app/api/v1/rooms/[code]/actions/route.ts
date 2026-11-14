import { performAction } from "@/server/game";
import { bearer, handle, ok, parseBody, rateLimit, roomCode } from "@/server/http";
import { ActionBody } from "@/server/schemas";

// Judging runs in the background after the response (via `after`); give it room to finish.
export const maxDuration = 30;

/**
 * POST /api/v1/rooms/:code/actions
 * Headers: Authorization: Bearer <token>   (optional for "timeout")
 * Body: { type: "post_bait" | "post_reply", text } | { type: "ignore" | "timeout" | "next" }
 * → { room }
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  rateLimit(req, "action", 20);
  const code = roomCode((await ctx.params).code);
  const action = await parseBody(req, ActionBody);
  const room = await performAction(code, bearer(req), action);
  return ok({ room });
});

import { rematch, requirePlayer } from "@/server/game";
import { bearer, handle, ok, rateLimit, roomCode } from "@/server/http";

/** POST /api/v1/rooms/:code/rematch  (Bearer token) → { code }  (the new room; second caller is auto-joined) */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  rateLimit(req, "rematch", 10, 60_000);
  const code = roomCode((await ctx.params).code);
  const player = await requirePlayer(bearer(req));
  return ok({ code: await rematch(code, player) });
});

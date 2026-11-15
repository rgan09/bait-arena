import { joinGame, requirePlayer } from "@/server/game";
import { bearer, handle, ok, rateLimit, roomCode } from "@/server/http";

/** POST /api/v1/rooms/:code/join  (Bearer token) → { room } */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  rateLimit(req, "join", 15, 60_000);
  const code = roomCode((await ctx.params).code);
  const player = await requirePlayer(bearer(req));
  return ok({ room: await joinGame(code, player) });
});

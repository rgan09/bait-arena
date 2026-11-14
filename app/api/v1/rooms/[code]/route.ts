import { getGame } from "@/server/game";
import { handle, ok, rateLimit, roomCode } from "@/server/http";

/** GET /api/v1/rooms/:code → { room, turns } */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  rateLimit(req, "read", 60);
  const code = roomCode((await ctx.params).code);
  return ok(await getGame(code));
});

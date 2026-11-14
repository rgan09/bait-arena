import { joinGame } from "@/server/game";
import { handle, ok, parseBody, rateLimit, roomCode } from "@/server/http";
import { JoinRoomBody } from "@/server/schemas";

/** POST /api/v1/rooms/:code/join  { name } → { code, seat, token, room } */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  rateLimit(req, "join", 10, 60_000);
  const code = roomCode((await ctx.params).code);
  const { name } = await parseBody(req, JoinRoomBody);
  return ok(await joinGame(code, name));
});

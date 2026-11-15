import { createGame, requirePlayer } from "@/server/game";
import { bearer, handle, ok, parseBody, rateLimit } from "@/server/http";
import { CreateRoomBody } from "@/server/schemas";

/** POST /api/v1/rooms  (Bearer token) { quick? } → { room }   (quick = shorter demo timers) */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "create", 10, 60_000);
  const player = await requirePlayer(bearer(req));
  const { quick } = await parseBody(req, CreateRoomBody);
  return ok({ room: await createGame(player, quick ? "quick" : "normal") }, 201);
});

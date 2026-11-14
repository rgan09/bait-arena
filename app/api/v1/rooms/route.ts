import { createGame } from "@/server/game";
import { handle, ok, parseBody, rateLimit } from "@/server/http";
import { CreateRoomBody } from "@/server/schemas";

/** POST /api/v1/rooms  { name, quick? } → { code, seat, token, room }   (quick = shorter demo timers) */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "create", 5, 60_000);
  const { name, quick } = await parseBody(req, CreateRoomBody);
  return ok(await createGame(name, quick ? "quick" : "normal"), 201);
});

import { createGame } from "@/server/game";
import { handle, ok, parseBody, rateLimit } from "@/server/http";
import { CreateRoomBody } from "@/server/schemas";

/** POST /api/v1/rooms  { name } → { code, seat, token, room } */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "create", 5, 60_000);
  const { name } = await parseBody(req, CreateRoomBody);
  return ok(await createGame(name), 201);
});

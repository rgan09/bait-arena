import { registerPlayer } from "@/server/game";
import { handle, ok, parseBody, rateLimit } from "@/server/http";
import { CreatePlayerBody } from "@/server/schemas";

/** POST /api/v1/players  { username } → { player, token }   (keep the token secret on the device) */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "players", 5, 60_000);
  const { username } = await parseBody(req, CreatePlayerBody);
  return ok(await registerPlayer(username), 201);
});

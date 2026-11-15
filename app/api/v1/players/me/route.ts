import { requirePlayer } from "@/server/game";
import { bearer, handle, ok, rateLimit } from "@/server/http";

/** GET /api/v1/players/me  (Bearer token) → { player } */
export const GET = handle(async (req: Request) => {
  rateLimit(req, "me", 30);
  return ok({ player: await requirePlayer(bearer(req)) });
});

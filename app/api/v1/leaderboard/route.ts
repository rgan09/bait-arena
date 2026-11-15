import { leaderboard } from "@/server/game";
import { handle, ok, rateLimit } from "@/server/http";

/** GET /api/v1/leaderboard → { players } (top 20 by Elo) */
export const GET = handle(async (req: Request) => {
  rateLimit(req, "leaderboard", 30);
  return ok({ players: await leaderboard(20) });
});

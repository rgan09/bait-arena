# 🎣 Bait Arena

1v1 ragebait battles judged by AI. Post bait. Don't take the bait. The judge roasts you both.

## How a game works

2 rounds; roles swap each round (`GAME.MATCH_ROUNDS` in `server/engine/config.ts`).

1. A **hot-take category** is drawn (Food crimes, LA life, Texting etiquette… see `lib/categories.ts`).
2. The **baiter** posts the spiciest take they can (45s, or 25s in ⚡ Quick mode). Stuck? **Inspo 🎲** shows an example (copying it exactly caps creativity).
3. The **responder** claps back or hits **Ignore** (30s / 15s).
4. The **AI judge** scores and roasts both. The reveal auto-advances.

Scoring (plan section 3 + ratio):
- Baiter = provocation + plausibility + creativity (max 30), **+10 if the responder took the bait**
- Responder = composure × 2 + ratio (max 30). Ignoring = safe 14; a calm, clever clap-back (e.g. 27) beats it.
- Flagged post (slurs, attacks on real people/groups) = 0 for its author. Ties break on total composure.

## Architecture

```
1. EXPERIENCE   app/, components/, hooks/      phones + projector (spectator view)
2. API GATEWAY  app/api/v1/ + server/http.ts    validation (zod), auth tokens, rate limits, JSON errors
   SERVICE      server/game.ts                  the only place engine + db + ai meet
3. ENGINE       server/engine/                  pure game rules / state machine (unit tested)
4. AI PIPELINE  server/ai/                      local moderation → Gemini safety → Gemini judge → fallback
5. EVENTS       Supabase Realtime               every room change is pushed to all screens
6. DATA         server/db/ + supabase/schema.sql   rooms, seats (secret tokens), turns
```

Concurrency: every room update is optimistic-locked on `version`, so two phones acting at once can't corrupt state.
Judging runs in the background (`after()`), and if Gemini is slow or rate-limited the game falls back to backup scoring instead of freezing.

## API (v1)

Auth: pick a username once → you get a secret token (kept in localStorage) → send `Authorization: Bearer <token>`.

| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/api/v1/players` | `{ username }` → `{ player, token }` | — |
| GET | `/api/v1/players/me` | → `{ player }` | Bearer |
| GET | `/api/v1/leaderboard` | → `{ players }` (top 20 by Elo) | — |
| POST | `/api/v1/rooms` | `{ quick? }` → `{ room }` | Bearer |
| POST | `/api/v1/rooms/:code/join` | → `{ room }` | Bearer |
| GET | `/api/v1/rooms/:code` | → `{ room, turns }` | — |
| POST | `/api/v1/rooms/:code/actions` | `{ type: "post_bait" \| "post_reply", text }` or `{ type: "ignore" \| "timeout" \| "next" }` | Bearer (not for timeout) |
| POST | `/api/v1/rooms/:code/rematch` | → `{ code }` (second caller is auto-joined) | Bearer |
| POST | `/api/judge` | `JudgeRequest` → `JudgeResult` (see `lib/types.ts`) | — |
| GET | `/api/v1/health` | — | — |

Errors always look like `{ "error": { "code": "not_your_turn", "message": "…" } }`.

## Bait School (/school)

Learn-to-ragebait mode: a **daily challenge** (one category per local day, personal best saved on the device),
**5 technique lessons** (`lib/lessons.ts`), each with an example and a "Try it" that tags the technique, and **free practice**.
Each post makes ONE Gemini call (`POST /api/school/post`) that grades the bait, checks the technique, and writes the
fake comment section, which grows and gets angrier with the score. `/api/judge-bait` and `/api/fake-replies` implement the
plan's separate contracts for anyone who needs them.

## Ranked

Everyone starts at 1000 Elo. When a match ends the server applies standard Elo (K = 32) exactly once.
Tiers: Grass Toucher (<900) → Lurker → Reply Guy (1000) → Quote Tweeter → Ratio Lord → Chronically Online 👑 (1300+).

## Setup

1. **Supabase** → SQL Editor → paste `supabase/schema.sql` → Run.
   (Re-run it after pulling new versions: it's safe to run again and adds any new columns.)
2. **Vercel** → import this repo, add the env vars from `.env.example`, deploy.
3. Open `/api/v1/health` on your deployment: every value should be `true`.

Local dev: `cp .env.example .env.local`, fill it in, then `npm install && npm run dev`.

## Scripts

- `npm run dev` — local dev server
- `npm test` — engine, AI pipeline and Bait School tests (no network needed)
- `npm run typecheck`, `npm run lint`

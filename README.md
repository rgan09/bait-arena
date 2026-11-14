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

| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/api/v1/rooms` | `{ name }` | — |
| POST | `/api/v1/rooms/:code/join` | `{ name }` | — |
| GET | `/api/v1/rooms/:code` | — | — |
| POST | `/api/v1/rooms/:code/actions` | `{ type: "post_bait" \| "post_reply", text }` or `{ type: "ignore" \| "timeout" \| "next" }` | `Bearer <token>` |
| GET | `/api/v1/health` | — | — |
| POST | `/api/judge` | `JudgeRequest { topic, bait, response \| null }` → `JudgeResult` (see `lib/types.ts`) | — |

Errors always look like `{ "error": { "code": "not_your_turn", "message": "…" } }`.

## Setup

1. **Supabase** → SQL Editor → paste `supabase/schema.sql` → Run.
   (Re-run it after pulling new versions: it's safe to run again and adds any new columns.)
2. **Vercel** → import this repo, add the env vars from `.env.example`, deploy.
3. Open `/api/v1/health` on your deployment: every value should be `true`.

Local dev: `cp .env.example .env.local`, fill it in, then `npm install && npm run dev`.

## Scripts

- `npm run dev` — local dev server
- `npm test` — engine + AI pipeline tests (no network needed)
- `npm run typecheck`, `npm run lint`

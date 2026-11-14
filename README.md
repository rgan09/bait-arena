# 🎣 Bait Arena

1v1 ragebait battles judged by AI. Post bait. Don't take the bait. The judge roasts you both.

## How a game works

Best of 3 rounds. Each round both players get the same topic and swap roles:

1. **Baiter** has 45s to post the baitiest take they can.
2. **Defender** has 30s to clap back, stay calm, or hit **Ignore**.
3. The **AI judge** scores the bait (provocation, plausibility, brevity, creativity) and the reply (composure), flags if the defender **took the bait** (+10 to the baiter), and roasts both.

Bait the topic, not the person: slurs or attacks on real people/groups are a **foul** and score zero.

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

Errors always look like `{ "error": { "code": "not_your_turn", "message": "…" } }`.

## Setup

1. **Supabase** → SQL Editor → paste `supabase/schema.sql` → Run.
2. **Vercel** → import this repo, add the env vars from `.env.example`, deploy.
3. Open `/api/v1/health` on your deployment: every value should be `true`.

Local dev: `cp .env.example .env.local`, fill it in, then `npm install && npm run dev`.

## Scripts

- `npm run dev` — local dev server
- `npm test` — engine + AI pipeline tests (no network needed)
- `npm run typecheck`, `npm run lint`

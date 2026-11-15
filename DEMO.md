# Demo runbook (~3 min)

## Before you go on stage
- [ ] Laptop on a **phone hotspot** (not venue Wi-Fi) if possible. Laptop plugged in.
- [ ] Open https://bait-arena.vercel.app/api/v1/health — every value must be `true`.
- [ ] Laptop: pick a username, tick **⚡ Quick mode**, **Create room**, then click **📺 Open the projector view**.
      Put that tab full-screen on the projector and click **🔊 Click to enable sound** once.
- [ ] Second tab ready on https://bait-arena.vercel.app/school (for Bait School).
- [ ] Backup recording of a full battle saved on the desktop (in case Wi-Fi dies).
- [ ] Don't spam test games in the hour before: the Gemini free tier is ~10 AI calls/minute.

## Script
1. **Hook (20s):** "Everyone's been ragebaited. Nobody's been *trained* for it."
2. **Bait School (30s):** open the daily challenge, post one take live, watch the comment section flood in.
   Then flash **Spot the Bait** for a card or two.
3. **Zen Mode (30s):** the AI baits the presenter. Reply calmly, then reply in ALL CAPS and watch it punish you.
4. **Main event (90s):** two judges scan the **QR code on the projector**, pick usernames, play a quick-mode 1v1.
   Scores, stamps ("TOOK THE BAIT 🎣" / "RATIO'D 💀") and roasts appear big on the projector.
5. **Close (10s):** the recap shows Elo changes, then open **🏆 Leaderboard**.

## If something breaks
- A phone froze → refresh it; the room state is on the server and comes back.
- "Backup scoring" on results → Gemini is rate-limited; the game still works. Keep going.
- Projector stuck on a timer → it nudges the server itself every few seconds; wait 3s or refresh.
- Total failure → play the backup recording.

## Cleanup
Delete test accounts in Supabase → SQL Editor:
```sql
delete from public.players where username like 'qa\_%';
```

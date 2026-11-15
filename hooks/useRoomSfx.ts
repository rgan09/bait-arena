"use client";
import { useEffect, useRef } from "react";
import { sfx, unlockAudio } from "@/lib/sfx";
import type { Room } from "@/lib/types";

/** Plays sounds when the room changes phase (works on phones and the projector). */
export function useRoomSfx(room: Room | null, now: number) {
  const prev = useRef<string | null>(null);
  const lastTick = useRef<number | null>(null);

  // Browsers need one tap/click/key before any sound can play.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!room) return;
    const key = `${room.turn}:${room.phase}`;
    if (prev.current === null) { prev.current = key; return; } // don't play on first load
    if (prev.current === key) return;
    prev.current = key;

    if (room.phase === "reply") sfx.pop();
    if (room.phase === "judging" && !room.ignored) sfx.pop();
    if (room.phase === "result" && room.last_turn) {
      const r = room.last_turn.result;
      sfx.ding();
      if (r.response?.took_bait && !r.flagged_bait) setTimeout(sfx.boom, 450);
      else if (r.response && r.response.ratio >= 8 && !r.flagged_response) setTimeout(sfx.ratio, 450);
    }
    if (room.phase === "recap") sfx.win();
  }, [room]);

  // Ticking in the last 5 seconds of a bait/reply.
  useEffect(() => {
    if (!room?.phase_ends_at || (room.phase !== "bait" && room.phase !== "reply")) return;
    const left = Math.ceil((new Date(room.phase_ends_at).getTime() - now) / 1000);
    if (left > 0 && left <= 5 && lastTick.current !== left) {
      lastTick.current = left;
      sfx.tick();
    }
  }, [room, now]);
}

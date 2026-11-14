"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Room, TurnRecord } from "@/lib/types";

/**
 * Live room state. Three sources, newest version wins:
 *   1. initial GET /api/v1/rooms/:code
 *   2. Supabase Realtime push on every change (instant)
 *   3. a slow poll as a safety net, in case a websocket drops mid-demo
 */
export function useRoom(code: string) {
  const [room, setRoomState] = useState<Room | null>(null);
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback((next: Room) => {
    setRoomState((prev) => (!prev || next.version >= prev.version ? next : prev));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getRoom(code);
      accept(data.room);
      setTurns(data.turns);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [code, accept]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch from an external system
    refresh();
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`room:${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` },
        (payload) => accept(payload.new as Room))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "turns", filter: `room_code=eq.${code}` },
        (payload) => setTurns((prev) =>
          prev.some((t) => t.turn === (payload.new as TurnRecord).turn) ? prev : [...prev, payload.new as TurnRecord]))
      .subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 4000);

    return () => {
      clearInterval(poll);
      sb.removeChannel(channel);
    };
  }, [code, refresh, accept]);

  return { room, turns, error, refresh, accept };
}

/** Ticks every `ms` so countdowns re-render. */
export function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

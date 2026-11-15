"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, forgetPlayer, loadPlayer, savePlayer } from "@/lib/api";
import type { Player, StoredPlayer } from "@/lib/types";

/**
 * The player on this device. `stored` = id/username/token from localStorage (instant);
 * `profile` = fresh Elo/wins from the server. `ready` = we've checked localStorage.
 */
export function usePlayer() {
  const [stored, setStored] = useState<StoredPlayer | null>(null);
  const [profile, setProfile] = useState<Player | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (s: StoredPlayer | null) => {
    if (!s) return;
    try {
      const { player } = await api.me(s.token);
      setProfile(player);
    } catch (e) {
      // Token no longer valid (e.g. database reset) → ask for a username again.
      if (e instanceof ApiError && e.status === 401) {
        forgetPlayer();
        setStored(null);
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    const s = loadPlayer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration
    setStored(s);
    setReady(true);
    refresh(s);
  }, [refresh]);

  const register = useCallback(async (username: string) => {
    const { player, token } = await api.createPlayer(username);
    const s = { id: player.id, username: player.username, token };
    savePlayer(s);
    setStored(s);
    setProfile(player);
    return s;
  }, []);

  const signOut = useCallback(() => {
    forgetPlayer();
    setStored(null);
    setProfile(null);
  }, []);

  return { player: stored, profile, ready, register, signOut, refresh: () => refresh(stored) };
}

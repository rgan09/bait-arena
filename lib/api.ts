"use client";
// Typed client for our own /api/v1 — the only way the UI changes game state.
import type { Action, Player, Room, StoredPlayer, TurnRecord } from "./types";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`/api/v1${path}`, { ...init, headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? "unknown", body?.error?.message ?? "Request failed.");
  }
  return body as T;
}

const post = (body?: unknown) => ({ method: "POST", body: JSON.stringify(body ?? {}) });

export const api = {
  createPlayer: (username: string) => call<{ player: Player; token: string }>("/players", post({ username })),
  me: (token: string) => call<{ player: Player }>("/players/me", { token }),
  leaderboard: () => call<{ players: Player[] }>("/leaderboard"),
  createRoom: (token: string, quick = false) => call<{ room: Room }>("/rooms", { ...post({ quick }), token }),
  joinRoom: (token: string, code: string) => call<{ room: Room }>(`/rooms/${code}/join`, { ...post(), token }),
  getRoom: (code: string) => call<{ room: Room; turns: TurnRecord[] }>(`/rooms/${code}`),
  act: (code: string, action: Action, token?: string) =>
    call<{ room: Room }>(`/rooms/${code}/actions`, { ...post(action), token }),
  rematch: (token: string, code: string) => call<{ code: string }>(`/rooms/${code}/rematch`, { ...post(), token }),
};

// ---------- the player saved on this device ----------

const KEY = "bait:player";

export function loadPlayer(): StoredPlayer | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredPlayer) : null;
  } catch {
    return null;
  }
}
export function savePlayer(p: StoredPlayer) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}
export function forgetPlayer() {
  try { localStorage.removeItem(KEY); } catch {}
}

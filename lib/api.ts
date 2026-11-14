"use client";
// Typed client for our own /api/v1 — the only way the UI changes game state.
import type { Action, PlayerSession, Room, Seat, TurnRecord } from "./types";

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

type Joined = { code: string; seat: Seat; token: string; room: Room };

export const api = {
  createRoom: (name: string) => call<Joined>("/rooms", { method: "POST", body: JSON.stringify({ name }) }),
  joinRoom: (code: string, name: string) =>
    call<Joined>(`/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ name }) }),
  getRoom: (code: string) => call<{ room: Room; turns: TurnRecord[] }>(`/rooms/${code}`),
  act: (code: string, action: Action, token?: string) =>
    call<{ room: Room }>(`/rooms/${code}/actions`, { method: "POST", body: JSON.stringify(action), token }),
};

// ---------- local player session ----------

const key = (code: string) => `bait:session:${code}`;

export function saveSession(s: PlayerSession) {
  try { localStorage.setItem(key(s.code), JSON.stringify(s)); } catch {}
}
export function loadSession(code: string): PlayerSession | null {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}
export function rememberName(name: string) {
  try { localStorage.setItem("bait:name", name); } catch {}
}
export function savedName(): string {
  try { return localStorage.getItem("bait:name") ?? ""; } catch { return ""; }
}

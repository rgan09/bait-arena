import type { Room, Seat, TurnRecord } from "@/lib/types";
import { db } from "./client";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I, L, O — easy to read off a projector

function randomCode(len = 4) {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export async function getRoom(code: string): Promise<Room | null> {
  const { data, error } = await db().from("rooms").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  return data as Room | null;
}

/** Creates a room with a fresh unique code and seats player A. Returns the room + A's secret token. */
export async function createRoom(nameA: string): Promise<{ room: Room; token: string }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const { data, error } = await db().from("rooms").insert({ code, player_a: nameA }).select("*").single();
    if (error?.code === "23505") continue; // code collision, try another
    if (error) throw error;
    const token = await createSeat(code, "a", nameA);
    return { room: data as Room, token };
  }
  throw new Error("Could not allocate a room code");
}

/**
 * Optimistic-locked update: only applies if nobody else changed the room since we read it.
 * Returns the new room, or null if we lost the race (caller should treat it as "already handled").
 */
export async function updateRoom(room: Room, patch: Partial<Room>): Promise<Room | null> {
  const { data, error } = await db()
    .from("rooms")
    .update({ ...patch, version: room.version + 1, updated_at: new Date().toISOString() })
    .eq("code", room.code)
    .eq("version", room.version)
    .select("*");
  if (error) throw error;
  return (data?.[0] as Room) ?? null;
}

// ---------- seats (secret player tokens) ----------

export async function createSeat(code: string, seat: Seat, name: string): Promise<string> {
  const { data, error } = await db()
    .from("seats")
    .insert({ room_code: code, seat, name })
    .select("token")
    .single();
  if (error) throw error;
  return data.token as string;
}

export async function findSeat(code: string, token: string): Promise<{ seat: Seat; name: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await db()
    .from("seats")
    .select("seat, name")
    .eq("room_code", code)
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as { seat: Seat; name: string }) ?? null;
}

// ---------- turns (history) ----------

export async function insertTurn(record: TurnRecord): Promise<void> {
  const { error } = await db().from("turns").insert(record);
  if (error && error.code !== "23505") throw error; // ignore duplicate (already recorded)
}

export async function listTurns(code: string): Promise<TurnRecord[]> {
  const { data, error } = await db().from("turns").select("*").eq("room_code", code).order("turn");
  if (error) throw error;
  return (data ?? []) as TurnRecord[];
}

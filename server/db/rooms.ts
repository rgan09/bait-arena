import type { Player, Room, Seat, TurnRecord } from "@/lib/types";
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

/** Creates a room with a fresh unique code and seats the player as A. */
export async function createRoom(
  player: Player,
  timers: { bait_seconds: number; reply_seconds: number; reveal_seconds: number },
): Promise<Room> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const { data, error } = await db()
      .from("rooms")
      .insert({ code, player_a: player.username, player_a_id: player.id, elo_a: player.elo, ...timers })
      .select("*")
      .single();
    if (error?.code === "23505") continue; // code collision, try another
    if (error) throw error;
    await createSeat(code, "a", player);
    return data as Room;
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

// ---------- seats (which player sits where; the primary key stops two people taking seat B) ----------

export async function createSeat(code: string, seat: Seat, player: Player): Promise<void> {
  const { error } = await db().from("seats").insert({ room_code: code, seat, name: player.username, player_id: player.id });
  if (error) throw error;
}

export async function findSeat(code: string, playerId: string): Promise<Seat | null> {
  const { data, error } = await db()
    .from("seats")
    .select("seat")
    .eq("room_code", code)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw error;
  return (data?.seat as Seat) ?? null;
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

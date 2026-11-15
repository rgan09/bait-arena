import type { Player } from "@/lib/types";
import { db } from "./client";

const PUBLIC = "id, username, elo, wins, losses, ties";

/** Claims a username. Returns null if it's taken (case-insensitive). */
export async function createPlayer(username: string): Promise<{ player: Player; token: string } | null> {
  const { data, error } = await db()
    .from("players")
    .insert({ username })
    .select(`${PUBLIC}, token`)
    .single();
  if (error?.code === "23505") return null;
  if (error) throw error;
  const { token, ...player } = data as Player & { token: string };
  return { player, token };
}

export async function findPlayerByToken(token: string): Promise<Player | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await db().from("players").select(PUBLIC).eq("token", token).maybeSingle();
  if (error) throw error;
  return (data as Player) ?? null;
}

export async function getPlayers(ids: string[]): Promise<Player[]> {
  const { data, error } = await db().from("players").select(PUBLIC).in("id", ids);
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function updatePlayerStats(
  id: string,
  patch: Pick<Player, "elo" | "wins" | "losses" | "ties">,
): Promise<void> {
  const { error } = await db().from("players").update(patch).eq("id", id);
  if (error) throw error;
}

export async function topPlayers(limit = 20): Promise<Player[]> {
  const { data, error } = await db()
    .from("players")
    .select(PUBLIC)
    .order("elo", { ascending: false })
    .order("wins", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Player[];
}

// Application service: the only place where engine + database + AI meet.
// API routes call these functions; they never touch the database or AI directly.

import { after } from "next/server";
import { getCategory } from "@/lib/categories";
import type { Action, Player, Room, TurnRecord } from "@/lib/types";
import { judge } from "./ai/pipeline";
import { createPlayer, findPlayerByToken, getPlayers, topPlayers, updatePlayerStats } from "./db/players";
import { createRoom, createSeat, findSeat, getRoom, insertTurn, listTurns, updateRoom } from "./db/rooms";
import {
  applyAction, finishTurn, matchWinner, realClock, startGame, TIMERS, updateElo, type TimerPreset,
} from "./engine";
import { HttpError } from "./http";

const MAX_RACE_RETRIES = 4;

async function mustGetRoom(code: string): Promise<Room> {
  const room = await getRoom(code);
  if (!room) throw new HttpError(404, "not_found", `No room called ${code}.`);
  return room;
}

// ---------- players ----------

export async function registerPlayer(username: string) {
  const created = await createPlayer(username);
  if (!created) throw new HttpError(409, "username_taken", "That username's taken. Try another.");
  return created;
}

/** Resolves `Authorization: Bearer <token>` to a player, or throws 401. */
export async function requirePlayer(token: string | null): Promise<Player> {
  const player = token ? await findPlayerByToken(token) : null;
  if (!player) throw new HttpError(401, "no_player", "Pick a username first.");
  return player;
}

export const leaderboard = (limit = 20) => topPlayers(limit);

// ---------- rooms ----------

export async function createGame(player: Player, preset: TimerPreset = "normal"): Promise<Room> {
  return createRoom(player, TIMERS[preset]);
}

export async function joinGame(code: string, player: Player): Promise<Room> {
  const room = await mustGetRoom(code);
  if (room.player_a_id === player.id || room.player_b_id === player.id) return room; // re-joining is fine
  if (room.player_b) throw new HttpError(409, "room_full", "This room is full. You can still watch.");

  try {
    await createSeat(code, "b", player);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new HttpError(409, "room_full", "Someone just took that seat.");
    throw err;
  }

  for (let i = 0; i < MAX_RACE_RETRIES; i++) {
    const current = await mustGetRoom(code);
    const t = startGame({ ...current, player_b: player.username }, realClock());
    if (!t.ok) throw new HttpError(t.status, t.code, t.message);
    const updated = await updateRoom(current, {
      player_b: player.username, player_b_id: player.id, elo_b: player.elo, ...t.patch,
    });
    if (updated) return updated;
  }
  throw new HttpError(503, "busy", "Room is busy, try again.");
}

export async function getGame(code: string): Promise<{ room: Room; turns: TurnRecord[] }> {
  const [room, turns] = await Promise.all([mustGetRoom(code), listTurns(code)]);
  return { room, turns };
}

export async function performAction(code: string, token: string | null, action: Action): Promise<Room> {
  // Timeouts may come from spectators (e.g. the projector) — no login needed for those.
  const player = token ? await findPlayerByToken(token) : null;
  const seat = player ? await findSeat(code, player.id) : null;
  if (!seat && action.type !== "timeout") throw new HttpError(403, "not_in_room", "You're not a player in this room.");

  for (let i = 0; i < MAX_RACE_RETRIES; i++) {
    const room = await mustGetRoom(code);
    const t = applyAction(room, seat, action, realClock());
    if (!t.ok) {
      // A timeout that's no longer relevant just means another phone already handled it.
      if (action.type === "timeout" && t.status === 409) return room;
      throw new HttpError(t.status, t.code, t.message);
    }

    const updated = Object.keys(t.patch).length ? await updateRoom(room, t.patch) : room;
    if (!updated) continue; // lost a race with the other phone — re-read and retry

    for (const effect of t.effects) {
      if (effect.type === "judge") after(() => judgeTurn(code, updated.turn, effect.forceFallback));
    }
    // We're the request that ended the match: settle Elo once.
    if (room.phase !== "recap" && updated.phase === "recap") after(() => finishMatch(code));
    return updated;
  }
  throw new HttpError(503, "busy", "Room is busy, try again.");
}

/** Runs the AI judge for the current round and records the result (if nobody beat us to it). */
export async function judgeTurn(code: string, turn: number, forceFallback = false) {
  const snapshot = await getRoom(code);
  if (!snapshot || snapshot.phase !== "judging" || snapshot.turn !== turn) return;

  const cat = getCategory(snapshot.topic);
  const result = await judge(
    { topic: `${cat.label} — ${cat.prompt}`, bait: snapshot.bait ?? "", response: snapshot.ignored ? null : snapshot.reply ?? "" },
    { forceFallback },
  );

  for (let i = 0; i < MAX_RACE_RETRIES; i++) {
    const room = await getRoom(code);
    if (!room || room.phase !== "judging" || room.turn !== turn) return; // already judged
    const finished = finishTurn(room, result, Date.now());
    if (!finished) return;
    const updated = await updateRoom(room, finished.patch);
    if (updated) {
      await insertTurn(finished.record);
      return;
    }
  }
}

/** Decides the winner and applies Elo exactly once (the room write is the lock). */
export async function finishMatch(code: string) {
  for (let i = 0; i < MAX_RACE_RETRIES; i++) {
    const room = await getRoom(code);
    if (!room || room.phase !== "recap" || room.winner) return;
    if (!room.player_a_id || !room.player_b_id) return;

    const [turns, players] = await Promise.all([listTurns(code), getPlayers([room.player_a_id, room.player_b_id])]);
    const pa = players.find((p) => p.id === room.player_a_id);
    const pb = players.find((p) => p.id === room.player_b_id);
    if (!pa || !pb) return;

    const winner = matchWinner(
      { a: room.player_a, b: room.player_b ?? "" },
      { a: room.score_a, b: room.score_b },
      turns,
    );
    const next = updateElo(pa.elo, pb.elo, winner === "a" ? 1 : winner === "b" ? 0 : 0.5);

    const claimed = await updateRoom(room, {
      winner,
      elo_result: { a: { before: pa.elo, after: next.a }, b: { before: pb.elo, after: next.b } },
    });
    if (!claimed) continue; // someone else is finishing — re-check

    await Promise.all([
      updatePlayerStats(pa.id, {
        elo: next.a,
        wins: pa.wins + (winner === "a" ? 1 : 0),
        losses: pa.losses + (winner === "b" ? 1 : 0),
        ties: pa.ties + (winner === "tie" ? 1 : 0),
      }),
      updatePlayerStats(pb.id, {
        elo: next.b,
        wins: pb.wins + (winner === "b" ? 1 : 0),
        losses: pb.losses + (winner === "a" ? 1 : 0),
        ties: pb.ties + (winner === "tie" ? 1 : 0),
      }),
    ]);
    return;
  }
}

/**
 * Rematch: the first player to ask creates a new room (same timers) and links it;
 * the second player gets auto-joined into that room. Returns the new room code.
 */
export async function rematch(code: string, player: Player): Promise<string> {
  const seat = await findSeat(code, player.id);
  if (!seat) throw new HttpError(403, "not_in_room", "Only the players can start a rematch.");

  for (let i = 0; i < MAX_RACE_RETRIES; i++) {
    const room = await mustGetRoom(code);
    if (room.phase !== "recap") throw new HttpError(409, "not_finished", "Finish this match first.");

    if (room.rematch_code) {
      await joinGame(room.rematch_code, player);
      return room.rematch_code;
    }
    const preset: TimerPreset = room.bait_seconds === TIMERS.quick.bait_seconds ? "quick" : "normal";
    const fresh = await createGame(player, preset);
    const linked = await updateRoom(room, { rematch_code: fresh.code });
    if (linked) return fresh.code;
    // Lost the race: the other player linked theirs first. Loop → join theirs (ours is left unused).
  }
  throw new HttpError(503, "busy", "Try again.");
}

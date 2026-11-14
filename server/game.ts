// Application service: the only place where engine + database + AI meet.
// API routes call these functions; they never touch the database or AI directly.

import { after } from "next/server";
import type { Action, Room, Seat, TurnRecord } from "@/lib/types";
import { applyAction, finishTurn, realClock, startGame } from "./engine";
import { createRoom, createSeat, findSeat, getRoom, insertTurn, listTurns, updateRoom } from "./db/rooms";
import { runJudging } from "./ai/pipeline";
import { HttpError } from "./http";

const MAX_RACE_RETRIES = 4;

async function mustGetRoom(code: string): Promise<Room> {
  const room = await getRoom(code);
  if (!room) throw new HttpError(404, "not_found", `No room called ${code}.`);
  return room;
}

export async function createGame(name: string) {
  const { room, token } = await createRoom(name);
  return { code: room.code, seat: "a" as Seat, token, room };
}

export async function joinGame(code: string, name: string) {
  const room = await mustGetRoom(code);
  if (room.player_b) throw new HttpError(409, "room_full", "This room is full. You can still watch.");
  if (room.player_a.toLowerCase() === name.toLowerCase()) {
    throw new HttpError(409, "name_taken", "That name's taken in this room. Pick another.");
  }

  let token: string;
  try {
    token = await createSeat(code, "b", name);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new HttpError(409, "room_full", "Someone just took that seat.");
    throw err;
  }

  for (let i = 0; i < MAX_RACE_RETRIES; i++) {
    const current = await mustGetRoom(code);
    const t = startGame({ ...current, player_b: name }, realClock());
    if (!t.ok) throw new HttpError(t.status, t.code, t.message);
    const updated = await updateRoom(current, { player_b: name, ...t.patch });
    if (updated) return { code, seat: "b" as Seat, token, room: updated };
  }
  throw new HttpError(503, "busy", "Room is busy, try again.");
}

export async function getGame(code: string): Promise<{ room: Room; turns: TurnRecord[] }> {
  const [room, turns] = await Promise.all([mustGetRoom(code), listTurns(code)]);
  return { room, turns };
}

export async function performAction(code: string, token: string | null, action: Action): Promise<Room> {
  const player = token ? await findSeat(code, token) : null;
  if (!player && action.type !== "timeout") throw new HttpError(401, "not_in_room", "You're not a player in this room.");
  const seat = player?.seat ?? null;

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
      if (effect.type === "judge") {
        // Respond to the player immediately; judge in the background.
        after(() => judgeTurn(code, updated.turn, effect.forceFallback));
      }
    }
    return updated;
  }
  throw new HttpError(503, "busy", "Room is busy, try again.");
}

/** Runs the AI pipeline for the current turn and records the result (if nobody beat us to it). */
export async function judgeTurn(code: string, turn: number, forceFallback = false) {
  const snapshot = await getRoom(code);
  if (!snapshot || snapshot.phase !== "judging" || snapshot.turn !== turn) return;

  const result = await runJudging(
    { topic: snapshot.topic ?? "", bait: snapshot.bait ?? "", reply: snapshot.reply, ignored: snapshot.ignored },
    { forceFallback },
  );

  for (let i = 0; i < MAX_RACE_RETRIES; i++) {
    const room = await getRoom(code);
    if (!room || room.phase !== "judging" || room.turn !== turn) return; // already judged
    const finished = finishTurn(room, result);
    if (!finished) return;
    const updated = await updateRoom(room, finished.patch);
    if (updated) {
      await insertTurn(finished.record);
      return;
    }
  }
}

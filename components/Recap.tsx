"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import { tierFor } from "@/lib/tiers";
import type { EloChange, Room, Seat, TurnRecord } from "@/lib/types";
import { matchWinner } from "@/server/engine/scoring";
import { Avatar, Button, Pill } from "./feed";
import { TierBadge } from "./TierBadge";

export function Recap({ room, turns, seat, token }: { room: Room; turns: TurnRecord[]; seat: Seat | null; token: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // The server's verdict wins once it's in; until then, compute it locally (same rules).
  const w = room.winner ?? matchWinner(
    { a: room.player_a, b: room.player_b ?? "" },
    { a: room.score_a, b: room.score_b },
    turns,
  );
  const winner = w === "a" ? room.player_a : w === "b" ? room.player_b ?? "" : null;
  const tieBroken = w !== "tie" && room.score_a === room.score_b;
  const best = [...turns].sort((x, y) => y.bait_points - x.bait_points)[0];
  const opponent = seat === "a" ? room.player_b : room.player_a;

  async function rematch() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const { code } = await api.rematch(token, room.code);
      router.push(`/room/${code}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't start a rematch.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Final</p>
      {winner ? (
        <div className="flex flex-col items-center gap-3">
          <Avatar name={winner} size={72} />
          <h2 className="text-4xl font-black">{winner} wins 👑</h2>
          {tieBroken && <p className="text-sm text-zinc-400">Tied on points, won on composure 🧊</p>}
        </div>
      ) : (
        <h2 className="text-4xl font-black">Dead even 🤝</h2>
      )}

      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        <PlayerResult name={room.player_a} score={room.score_a} elo={room.elo_result?.a} startElo={room.elo_a} me={seat === "a"} />
        <PlayerResult name={room.player_b ?? ""} score={room.score_b} elo={room.elo_result?.b} startElo={room.elo_b} me={seat === "b"} />
      </div>

      {/* Rematch */}
      <div className="space-y-2">
        {seat ? (
          room.rematch_code ? (
            <Button disabled={busy} onClick={rematch}>{busy ? "Joining…" : `🔁 @${opponent} wants a rematch: join`}</Button>
          ) : (
            <Button disabled={busy} onClick={rematch}>{busy ? "Setting up…" : "🔁 Rematch"}</Button>
          )
        ) : (
          room.rematch_code && (
            <Link href={`/room/${room.rematch_code}`} className="text-sky-400 underline">Watch the rematch →</Link>
          )
        )}
        {err && <p className="text-sm text-rose-400">{err}</p>}
      </div>

      {best && best.bait && (
        <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-left">
          <Pill tone="amber">🏆 Hottest take</Pill>
          <p className="mt-3 text-sm text-zinc-500">{best.baiter} · {getCategory(best.topic).emoji} {getCategory(best.topic).label}</p>
          <p className="mt-1 text-xl text-zinc-100">“{best.bait}”</p>
          <p className="mt-3 text-zinc-300">🔥 {best.result.roast}</p>
        </div>
      )}

      <div className="mx-auto max-w-md space-y-2 text-left">
        {turns.map((t) => (
          <div key={t.turn} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm">
            <span className="truncate text-zinc-300">R{t.round} · {t.baiter} · {getCategory(t.topic).emoji} {getCategory(t.topic).label}</span>
            <span className="shrink-0 font-mono text-zinc-400">+{t.bait_points} / +{t.reply_points}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Link href="/leaderboard" className="rounded-full border border-zinc-700 px-5 py-2.5 font-bold text-zinc-200 hover:bg-zinc-800">🏆 Leaderboard</Link>
        <Link href="/" className="rounded-full border border-zinc-700 px-5 py-2.5 font-bold text-zinc-200 hover:bg-zinc-800">Home</Link>
      </div>
    </div>
  );
}

function PlayerResult({
  name, score, elo, startElo, me,
}: { name: string; score: number; elo: EloChange | undefined; startElo: number | null; me: boolean }) {
  const delta = elo ? elo.after - elo.before : null;
  const promoted = elo && tierFor(elo.after).name !== tierFor(elo.before).name;
  return (
    <div className={`rounded-2xl border p-4 ${me ? "border-sky-500/40 bg-sky-500/5" : "border-zinc-800"}`}>
      <p className="truncate font-bold">{name}{me ? " (you)" : ""}</p>
      <p className="font-mono text-3xl font-black text-sky-400">{score}</p>
      {elo ? (
        <>
          <p className="mt-1 font-mono text-sm">
            {elo.before} → <b>{elo.after}</b>{" "}
            <span className={delta! >= 0 ? "text-emerald-400" : "text-rose-400"}>({delta! >= 0 ? "+" : ""}{delta})</span>
          </p>
          <div className="mt-2"><TierBadge elo={elo.after} /></div>
          {promoted && (
            <p className={`mt-1 text-xs font-bold ${delta! > 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta! > 0 ? "⬆️ Ranked up!" : "⬇️ Ranked down"}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 animate-pulse text-xs text-zinc-500">{startElo != null ? "Updating ranks…" : ""}</p>
      )}
    </div>
  );
}

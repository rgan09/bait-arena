"use client";
import Link from "next/link";
import { getCategory } from "@/lib/categories";
import type { Room, TurnRecord } from "@/lib/types";
import { matchWinner } from "@/server/engine/scoring";
import { Avatar, Pill } from "./feed";

export function Recap({ room, turns }: { room: Room; turns: TurnRecord[] }) {
  const w = matchWinner(
    { a: room.player_a, b: room.player_b ?? "" },
    { a: room.score_a, b: room.score_b },
    turns,
  );
  const winner = w === "a" ? room.player_a : w === "b" ? room.player_b ?? "" : null;
  const tieBroken = w !== "tie" && room.score_a === room.score_b;
  const best = [...turns].sort((x, y) => y.bait_points - x.bait_points)[0];

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
      <div className="flex justify-center gap-8 font-mono text-2xl">
        <span>{room.player_a} <b className="text-sky-400">{room.score_a}</b></span>
        <span className="text-zinc-600">vs</span>
        <span>{room.player_b} <b className="text-sky-400">{room.score_b}</b></span>
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

      <Link href="/" className="inline-block rounded-full bg-sky-500 px-6 py-2.5 font-bold text-white hover:bg-sky-400">
        Play again
      </Link>
    </div>
  );
}

"use client";
import Link from "next/link";
import type { Room, TurnRecord } from "@/lib/types";
import { Avatar, Pill } from "./feed";

export function Recap({ room, turns }: { room: Room; turns: TurnRecord[] }) {
  const tie = room.score_a === room.score_b;
  const winner = room.score_a > room.score_b ? room.player_a : room.player_b ?? "";
  const best = [...turns].sort((x, y) => y.bait_points - x.bait_points)[0];

  return (
    <div className="space-y-6 px-4 py-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Final</p>
      {tie ? (
        <h2 className="text-4xl font-black">It&apos;s a tie 🤝</h2>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Avatar name={winner} size={72} />
          <h2 className="text-4xl font-black">{winner} wins 👑</h2>
        </div>
      )}
      <div className="flex justify-center gap-8 font-mono text-2xl">
        <span>{room.player_a} <b className="text-sky-400">{room.score_a}</b></span>
        <span className="text-zinc-600">vs</span>
        <span>{room.player_b} <b className="text-sky-400">{room.score_b}</b></span>
      </div>

      {best && (
        <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-left">
          <Pill tone="amber">🏆 Funniest moment</Pill>
          <p className="mt-3 text-sm text-zinc-500">{best.baiter} on {best.topic}:</p>
          <p className="mt-1 text-xl text-zinc-100">“{best.bait}”</p>
          <p className="mt-3 text-zinc-300">🔥 {best.result.roast_bait}</p>
        </div>
      )}

      <div className="mx-auto max-w-md space-y-2 text-left">
        {turns.map((t) => (
          <div key={t.turn} className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-2 text-sm">
            <span className="truncate text-zinc-300">R{t.round} · {t.baiter} baited <i>{t.topic}</i></span>
            <span className="font-mono text-zinc-400">+{t.bait_points} / +{t.reply_points}</span>
          </div>
        ))}
      </div>

      <Link href="/" className="inline-block rounded-full bg-sky-500 px-6 py-2.5 font-bold text-white hover:bg-sky-400">
        Play again
      </Link>
    </div>
  );
}

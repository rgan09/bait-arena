"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/feed";
import { TierBadge } from "@/components/TierBadge";
import { usePlayer } from "@/hooks/usePlayer";
import { api } from "@/lib/api";
import { TIERS } from "@/lib/tiers";
import type { Player } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { player } = usePlayer();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.leaderboard().then((r) => setPlayers(r.players)).catch((e) => setErr((e as Error).message));
  }, []);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto min-h-screen max-w-xl border-x border-zinc-800">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur">
          <Link href="/" className="text-lg font-black tracking-tight">🎣 Bait Arena</Link>
          <span className="text-sm font-semibold text-zinc-400">Leaderboard</span>
        </header>

        <div className="px-4 py-6">
          <h1 className="text-3xl font-black">Most chronically online 👑</h1>
          <p className="mt-1 text-sm text-zinc-500">Top 20 by Elo. Win battles to climb.</p>
        </div>

        {err && <p className="px-4 text-rose-400">{err}</p>}
        {!players && !err && <p className="px-4 text-zinc-500">Loading…</p>}

        <ol>
          {players?.map((p, i) => {
            const me = p.id === player?.id;
            return (
              <li key={p.id} className={`flex items-center gap-3 border-b border-zinc-800 px-4 py-3 ${me ? "bg-sky-500/10" : ""}`}>
                <span className="w-8 text-center font-mono text-zinc-400">{MEDALS[i] ?? i + 1}</span>
                <Avatar name={p.username} size={36} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-bold ${me ? "text-sky-300" : ""}`}>@{p.username}{me ? " (you)" : ""}</p>
                  <p className="text-xs text-zinc-500">{p.wins}W · {p.losses}L{p.ties ? ` · ${p.ties}T` : ""}</p>
                </div>
                <TierBadge elo={p.elo} />
                <span className="w-12 text-right font-mono font-bold">{p.elo}</span>
              </li>
            );
          })}
        </ol>

        <section className="px-4 py-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Tiers</p>
          <div className="flex flex-wrap gap-2">
            {TIERS.map((t, i) => (
              <span key={t.name} className={`rounded-full border px-3 py-1 text-xs font-semibold ${t.className}`}>
                {t.name} <span className="font-mono opacity-60">{i === 0 ? "<900" : `${t.min}+`}</span>
              </span>
            ))}
          </div>
          <Link href="/" className="mt-8 inline-block rounded-full bg-sky-500 px-6 py-2.5 font-bold text-white hover:bg-sky-400">
            Battle someone →
          </Link>
        </section>
      </div>
    </main>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button } from "@/components/feed";
import { TierBadge } from "@/components/TierBadge";
import { UsernameForm } from "@/components/UsernameForm";
import { usePlayer } from "@/hooks/usePlayer";
import { api, ApiError } from "@/lib/api";

const HOW = [
  ["🎲", "A category is drawn", "Food crimes, LA life, texting etiquette…"],
  ["🔥", "Red corner baits", "Post the spiciest take you can. Sound sincere."],
  ["🧊", "Blue corner defends", "Clap back calmly or ignore it. Lose your cool, lose the round."],
];

// Solo modes are built by Person B at these routes.
const MODES = [
  { href: "/zen", icon: "🧘", title: "Zen Mode", sub: "AI baits you. Don't bite." },
  { href: "/school", icon: "🎓", title: "Bait School", sub: "Daily challenge + lessons" },
  { href: "/spot", icon: "🕵️", title: "Spot the Bait", sub: "Sincere or bait? 7 seconds." },
];

export default function Home() {
  const router = useRouter();
  const { player, profile, ready, register, signOut } = usePlayer();
  const [code, setCode] = useState("");
  const [quick, setQuick] = useState(false);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [canWatch, setCanWatch] = useState(false);

  async function create() {
    if (!player) return;
    setBusy("create"); setErr(null);
    try {
      const { room } = await api.createRoom(player.token, quick);
      router.push(`/room/${room.code}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't create a room.");
      setBusy(null);
    }
  }

  async function join() {
    if (!player) return;
    const c = code.trim().toUpperCase();
    setBusy("join"); setErr(null); setCanWatch(false);
    try {
      await api.joinRoom(player.token, c);
      router.push(`/room/${c}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "room_full") setCanWatch(true);
      setErr(e instanceof ApiError ? e.message : "Couldn't join.");
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-5 text-zinc-100">
      <div className="mx-auto w-full max-w-md space-y-6 py-10">
        <div className="flex justify-end">
          <Link href="/leaderboard" className="rounded-xl border-2 border-zinc-700 bg-canvas px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:border-spot">
            🏆 Rankings
          </Link>
        </div>

        <div className="relative pt-2 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-between px-2 text-5xl opacity-90" aria-hidden>
            <span className="-rotate-12">🔥</span>
            <span className="rotate-12">🧊</span>
          </div>
          <h1 className="marquee text-[5.2rem] sm:text-8xl">BAIT<br />ARENA</h1>
          <p className="mx-auto mt-4 max-w-sm text-lg leading-snug text-zinc-300">
            1v1 hot-take fights. One of you posts the bait, the other tries not to bite. An AI judge scores it and roasts you both.
          </p>
        </div>

        {!ready ? null : !player ? (
          <section className="space-y-4 rounded-3xl border-2 border-spot/50 bg-canvas p-5">
            <p className="text-center font-display text-lg">Pick your fighter name</p>
            <UsernameForm onSubmit={register} />
          </section>
        ) : (
          <>
            <section className="flex items-center gap-3 rounded-3xl bg-canvas p-4">
              <Avatar name={player.username} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">@{player.username}</p>
                <p className="text-xs text-zinc-500">
                  {profile ? `${profile.wins} wins, ${profile.losses} losses` : "…"}{" "}
                  <button onClick={signOut} className="ml-1 underline hover:text-zinc-300" title="Use a different username on this device">
                    not you?
                  </button>
                </p>
              </div>
              <TierBadge elo={profile?.elo} showElo size="md" />
            </section>

            <section className="space-y-3 rounded-3xl border-2 border-spot/60 bg-canvas p-5 shadow-[0_0_60px_-20px_rgb(255_210_63/0.5)]">
              <p className="font-display text-xl text-bone">Ranked 1v1</p>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-night/60 px-4 py-3 text-sm">
                <span>
                  <b className="text-zinc-200">⚡ Quick mode</b>
                  <span className="block text-zinc-500">25s takes · 15s replies. Best for demos.</span>
                </span>
                <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} className="h-5 w-5 accent-sky-500" />
              </label>
              <div className="flex justify-center">
                <Button disabled={busy !== null} onClick={create}>{busy === "create" ? "Opening the ring…" : "Start a fight"}</Button>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <div className="h-px flex-1 bg-zinc-800" /> or join with a code <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); join(); }}>
                <input
                  value={code}
                  maxLength={4}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                  placeholder="ABCD"
                  aria-label="Room code"
                  className="w-full rounded-xl border-2 border-zinc-700 bg-night/60 px-5 py-2 text-center font-display text-xl tracking-[0.35em] focus:border-spot focus:outline-none"
                />
                <Button type="submit" disabled={code.length !== 4 || busy !== null}>{busy === "join" ? "…" : "Join"}</Button>
              </form>
              {canWatch && (
                <button className="w-full text-sm text-sky-400 underline" onClick={() => router.push(`/room/${code}`)}>
                  Watch as a spectator instead
                </button>
              )}
              {err && <p className="text-center text-sm text-rose-400">{err}</p>}
            </section>
          </>
        )}

        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <Link key={m.href} href={m.href} className="rounded-2xl border-2 border-zinc-800 bg-canvas/70 p-3 transition hover:border-spot">
              <div className="text-2xl">{m.icon}</div>
              <p className="mt-1 text-sm font-bold leading-tight">{m.title}</p>
              <p className="text-xs text-zinc-500">{m.sub}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {HOW.map(([icon, title, sub]) => (
            <div key={title} className="rounded-2xl bg-canvas/50 p-3">
              <div className="text-2xl">{icon}</div>
              <p className="mt-1 text-xs font-bold text-zinc-200">{title}</p>
              <p className="mt-1 text-[11px] leading-snug text-zinc-500">{sub}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-600">Bait the topic, not the person. Slurs and attacks score zero.</p>
      </div>
    </main>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/feed";
import { api, ApiError, rememberName, saveSession, savedName } from "@/lib/api";
import { GAME } from "@/server/engine/config";

const TIERS = ["Grass Toucher", "Lurker", "Reply Guy", "Quote Tweeter", "Ratio Lord", "Chronically Online 👑"];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [canWatch, setCanWatch] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration
  useEffect(() => setName(savedName()), []);

  async function create() {
    setBusy("create"); setErr(null);
    try {
      const res = await api.createRoom(name);
      saveSession({ code: res.code, seat: res.seat, name: name.trim(), token: res.token });
      rememberName(name.trim());
      router.push(`/room/${res.code}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't create a room.");
      setBusy(null);
    }
  }

  async function join() {
    const c = code.trim().toUpperCase();
    setBusy("join"); setErr(null); setCanWatch(false);
    try {
      const res = await api.joinRoom(c, name);
      saveSession({ code: c, seat: res.seat, name: name.trim(), token: res.token });
      rememberName(name.trim());
      router.push(`/room/${c}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "room_full") setCanWatch(true);
      setErr(e instanceof ApiError ? e.message : "Couldn't join.");
      setBusy(null);
    }
  }

  const nameOk = name.trim().length > 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-zinc-100">
      <div className="w-full max-w-md space-y-8 py-12">
        <div className="space-y-3 text-center">
          <div className="text-6xl">🎣</div>
          <h1 className="text-5xl font-black tracking-tight">Bait Arena</h1>
          <p className="text-zinc-400">1v1 ragebait battles. Post bait. Don&apos;t take the bait. An AI judge roasts you both.</p>
        </div>

        <input
          value={name}
          maxLength={GAME.NAME_MAX_CHARS}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your nickname"
          className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-center text-lg focus:border-sky-500 focus:outline-none"
        />

        <div className="space-y-3 rounded-3xl border border-zinc-800 p-5">
          <p className="text-sm font-semibold text-zinc-400">Start a battle</p>
          <div className="flex justify-center">
            <Button disabled={!nameOk || busy !== null} onClick={create}>
              {busy === "create" ? "Creating…" : "Create room"}
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-zinc-800 p-5">
          <p className="text-sm font-semibold text-zinc-400">Got a code?</p>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); join(); }}>
            <input
              value={code}
              maxLength={4}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              placeholder="ABCD"
              className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2 text-center font-mono text-xl tracking-[0.4em] focus:border-sky-500 focus:outline-none"
            />
            <Button type="submit" disabled={!nameOk || code.length !== 4 || busy !== null}>
              {busy === "join" ? "…" : "Join"}
            </Button>
          </form>
          {canWatch && (
            <button className="w-full text-sm text-sky-400 underline" onClick={() => router.push(`/room/${code}`)}>
              Watch as a spectator instead
            </button>
          )}
        </div>

        {err && <p className="text-center text-sm text-rose-400">{err}</p>}

        <div className="text-center text-xs text-zinc-600">
          <p className="mb-2 uppercase tracking-widest">Ranks</p>
          <p>{TIERS.join(" → ")}</p>
          <p className="mt-4">Bait the topic, not the person. Slurs and attacks score zero.</p>
        </div>
      </div>
    </main>
  );
}

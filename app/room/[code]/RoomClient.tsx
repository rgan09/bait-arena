"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { Avatar, Button, Countdown, Pill, Post } from "@/components/feed";
import { Recap } from "@/components/Recap";
import { ResultCard } from "@/components/ResultCard";
import { useNow, useRoom } from "@/hooks/useRoom";
import { api, ApiError, loadSession, rememberName, saveSession, savedName } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import type { Action, PlayerSession, Room } from "@/lib/types";
import { GAME, TOTAL_TURNS } from "@/server/engine/config";

const baiterSeat = (turn: number) => (turn % 2 === 0 ? "a" : "b");
const replierSeat = (turn: number) => (turn % 2 === 0 ? "b" : "a");
const nameOf = (room: Room, seat: "a" | "b") => (seat === "a" ? room.player_a : room.player_b ?? "???");

export default function RoomClient({ code }: { code: string }) {
  const { room, turns, error, accept } = useRoom(code);
  const now = useNow();

  const [session, setSession] = useState<PlayerSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const draft = useRef("");
  const fired = useRef("");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration
  useEffect(() => setSession(loadSession(code)), [code]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const seat = session?.seat ?? null;
  const phaseKey = room ? `${room.turn}:${room.phase}` : "";
  useEffect(() => { draft.current = ""; }, [phaseKey]);

  const act = useCallback(
    async (action: Action, silent = false) => {
      setBusy(true);
      try {
        const res = await api.act(code, action, session?.token);
        accept(res.room);
      } catch (e) {
        if (!silent) setToast(e instanceof ApiError ? e.message : "Network hiccup. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [code, session, accept],
  );

  // When a timer hits zero: the active player auto-posts their draft; everyone else nudges the server shortly after.
  useEffect(() => {
    if (!room?.phase_ends_at || !["bait", "reply", "judging", "result"].includes(room.phase)) return;
    const active =
      (room.phase === "bait" && seat === baiterSeat(room.turn)) ||
      (room.phase === "reply" && seat === replierSeat(room.turn));
    const left = new Date(room.phase_ends_at).getTime() - now;
    if (left > (active ? 0 : -1500)) return;
    if (fired.current === phaseKey) return;
    fired.current = phaseKey;
    const text = draft.current.trim();
    if (active && text) act({ type: room.phase === "bait" ? "post_bait" : "post_reply", text }, true);
    else act({ type: "timeout" }, true);
  }, [now, room, seat, phaseKey, act]);

  if (!room) {
    return (
      <Shell>
        <div className="p-10 text-center text-zinc-500">
          {error ? (
            <>
              <p className="mb-4">{error}</p>
              <Link href="/" className="text-sky-400 underline">Back home</Link>
            </>
          ) : (
            "Loading the timeline…"
          )}
        </div>
      </Shell>
    );
  }

  const baiter = nameOf(room, baiterSeat(room.turn));
  const replier = nameOf(room, replierSeat(room.turn));
  const myRole =
    !seat ? "spectating" : room.phase === "lobby" || room.phase === "recap" ? null
      : seat === baiterSeat(room.turn) ? "baiting" : "defending";

  return (
    <Shell>
      <Header room={room} seat={seat} role={myRole} />

      {/* ---------- LOBBY ---------- */}
      {room.phase === "lobby" && (
        !session && !room.player_b ? (
          <JoinInline code={code} onJoined={(s) => { setSession(s); }} accept={accept} />
        ) : (
          <div className="space-y-4 px-4 py-12 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Room code</p>
            <p className="font-mono text-7xl font-black tracking-[0.2em] text-sky-400">{room.code}</p>
            <p className="text-zinc-400">Tell your opponent to open the site and enter this code.</p>
            <CopyLink code={room.code} />
            <p className="animate-pulse pt-6 text-zinc-500">Waiting for an opponent…</p>
          </div>
        )
      )}

      {/* ---------- BAIT ---------- */}
      {room.phase === "bait" && (
        <>
          <TopicBanner topic={room.topic} />
          <Countdown endsAt={room.phase_ends_at} total={room.bait_seconds} now={now} />
          {seat === baiterSeat(room.turn) ? (
            <>
            <Inspo key={`inspo-${phaseKey}`} topic={room.topic} />
            <Composer
              key={phaseKey}
              name={baiter}
              placeholder="Drop your hottest take…"
              submitLabel="Post take"
              busy={busy}
              onDraft={(t) => (draft.current = t)}
              onSubmit={(text) => act({ type: "post_bait", text })}
            />
            </>
          ) : (
            <Typing name={baiter} label="is cooking up a hot take" />
          )}
        </>
      )}

      {/* ---------- REPLY ---------- */}
      {room.phase === "reply" && (
        <>
          <TopicBanner topic={room.topic} />
          <Countdown endsAt={room.phase_ends_at} total={room.reply_seconds} now={now} />
          <Post name={baiter} text={room.bait ?? ""} meta="just now" big />
          {seat === replierSeat(room.turn) ? (
            <Composer
              key={phaseKey}
              name={replier}
              placeholder="Clap back, stay calm… or don't reply at all."
              submitLabel="Reply"
              busy={busy}
              onDraft={(t) => (draft.current = t)}
              onSubmit={(text) => act({ type: "post_reply", text })}
              extra={<Button variant="ghost" disabled={busy} onClick={() => act({ type: "ignore" })}>Ignore 🧘</Button>}
            />
          ) : (
            <Typing name={replier} label="is deciding whether to bite" />
          )}
        </>
      )}

      {/* ---------- JUDGING ---------- */}
      {room.phase === "judging" && (
        <>
          <TopicBanner topic={room.topic} />
          <Post name={baiter} text={room.bait || <i className="text-zinc-500">(posted nothing)</i>} meta="bait" />
          {room.ignored ? (
            <div className="border-b border-zinc-800 px-4 py-3 text-sm italic text-zinc-500">{replier} scrolled past 🧘</div>
          ) : (
            <Post name={replier} text={room.reply ?? ""} meta="replying" />
          )}
          <div className="flex flex-col items-center gap-3 py-12 text-zinc-400">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-sky-500" />
            <p>⚖️ The judge is reading the comments…</p>
          </div>
        </>
      )}

      {/* ---------- RESULT ---------- */}
      {room.phase === "result" && room.last_turn && (
        <>
          <ResultCard turn={room.last_turn} />
          <Countdown endsAt={room.phase_ends_at} total={room.reveal_seconds} now={now} label={room.turn + 1 >= TOTAL_TURNS ? "Final results in" : "Next round in"} />
          <div className="flex justify-center py-6 pb-10">
            {seat ? (
              <Button disabled={busy} onClick={() => act({ type: "next" })}>
                {room.turn + 1 >= TOTAL_TURNS ? "See final results →" : "Next round (swap roles) →"}
              </Button>
            ) : (
              <p className="text-sm text-zinc-500">Waiting for the players…</p>
            )}
          </div>
        </>
      )}

      {/* ---------- RECAP ---------- */}
      {room.phase === "recap" && <Recap room={room} turns={turns} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}

// ---------- pieces ----------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto min-h-screen max-w-xl border-x border-zinc-800">{children}</div>
    </main>
  );
}

function Header({ room, seat, role }: { room: Room; seat: "a" | "b" | null; role: string | null }) {
  const round = Math.min(GAME.MATCH_ROUNDS, room.turn + 1);
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-black tracking-tight">🎣 Bait Arena</Link>
        <div className="flex items-center gap-2">
          {role && <Pill tone={role === "baiting" ? "rose" : role === "defending" ? "emerald" : "zinc"}>{role === "baiting" ? "You're baiting" : role === "defending" ? "You're defending" : "Spectating 👀"}</Pill>}
          <Pill>{room.code}</Pill>
        </div>
      </div>
      {room.player_b && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <Score name={room.player_a} score={room.score_a} me={seat === "a"} />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {room.phase === "recap" ? "Final" : `Round ${round}/${GAME.MATCH_ROUNDS}`}
          </span>
          <Score name={room.player_b} score={room.score_b} me={seat === "b"} right />
        </div>
      )}
    </header>
  );
}

function Score({ name, score, me, right }: { name: string; score: number; me: boolean; right?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${right ? "flex-row-reverse" : ""}`}>
      <Avatar name={name} size={28} />
      <span className={`max-w-24 truncate ${me ? "font-bold text-sky-300" : "text-zinc-300"}`}>{name}{me ? " (you)" : ""}</span>
      <span className="font-mono text-lg font-bold">{score}</span>
    </div>
  );
}

function TopicBanner({ topic }: { topic: string | null }) {
  const cat = getCategory(topic);
  return (
    <div className="border-b border-zinc-800 px-4 py-4 text-center">
      <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">Hot-take category</span>
      <p className="text-3xl font-black">{cat.emoji} {cat.label}</p>
      <p className="mt-1 text-sm text-zinc-400">{cat.prompt}</p>
    </div>
  );
}

/** "Stuck?" helper: shows a pre-written take from the category. Zero AI calls. */
function Inspo({ topic }: { topic: string | null }) {
  const takes = getCategory(topic).takes;
  const [i, setI] = useState<number | null>(null);
  if (!takes.length) return null;
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2 text-sm">
      <button
        type="button"
        onClick={() => setI((prev) => (prev === null ? Math.floor(Math.random() * takes.length) : (prev + 1) % takes.length))}
        className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 font-semibold text-zinc-300 hover:bg-zinc-800"
      >
        Inspo 🎲
      </button>
      <span className="text-zinc-400">
        {i === null ? "Stuck? Get an example. (Copying it exactly kills your creativity score.)" : <i>“{takes[i]}”</i>}
      </span>
    </div>
  );
}

function Typing({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-8 text-zinc-400">
      <Avatar name={name} />
      <span><b className="text-zinc-200">{name}</b> {label}</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </span>
    </div>
  );
}

function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${location.origin}/room/${code}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? "Copied ✓" : "Copy invite link"}
    </Button>
  );
}

function JoinInline({
  code, onJoined, accept,
}: { code: string; onJoined: (s: PlayerSession) => void; accept: (r: Room) => void }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration
  useEffect(() => setName(savedName()), []);

  return (
    <form
      className="space-y-4 px-6 py-12 text-center"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          const res = await api.joinRoom(code, name);
          const s: PlayerSession = { code, seat: res.seat, name, token: res.token };
          saveSession(s);
          rememberName(name);
          onJoined(s);
          accept(res.room);
        } catch (e) {
          setErr(e instanceof ApiError ? e.message : "Couldn't join.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-2xl font-black">You&apos;ve been challenged 🎣</h2>
      <input
        autoFocus
        value={name}
        maxLength={GAME.NAME_MAX_CHARS}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your nickname"
        className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-center text-lg focus:border-sky-500 focus:outline-none"
      />
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <Button type="submit" disabled={!name.trim() || busy}>{busy ? "Joining…" : "Join the battle"}</Button>
    </form>
  );
}

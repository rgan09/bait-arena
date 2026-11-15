"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { Avatar, Button, Countdown, Pill, Post } from "@/components/feed";
import { Recap } from "@/components/Recap";
import { ResultCard } from "@/components/ResultCard";
import { JoinQR } from "@/components/JoinQR";
import { TierBadge } from "@/components/TierBadge";
import { UsernameForm } from "@/components/UsernameForm";
import { usePlayer } from "@/hooks/usePlayer";
import { useNow, useRoom } from "@/hooks/useRoom";
import { useRoomSfx } from "@/hooks/useRoomSfx";
import { SoundToggle } from "@/components/SoundToggle";
import { JudgeCooking } from "@/components/JudgeCooking";
import { api, ApiError } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import type { Action, Room, Seat, StoredPlayer } from "@/lib/types";
import { GAME, TOTAL_TURNS } from "@/server/engine/config";

const baiterSeat = (turn: number) => (turn % 2 === 0 ? "a" : "b");
const replierSeat = (turn: number) => (turn % 2 === 0 ? "b" : "a");
const nameOf = (room: Room, seat: "a" | "b") => (seat === "a" ? room.player_a : room.player_b ?? "???");

export default function RoomClient({ code }: { code: string }) {
  const { room, turns, error, accept } = useRoom(code);
  const now = useNow();
  useRoomSfx(room, now);

  const { player, register } = usePlayer();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const draft = useRef("");
  const fired = useRef("");

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // My seat comes from the room itself: which side has my player id.
  const seat: Seat | null = !room || !player ? null : room.player_a_id === player.id ? "a" : room.player_b_id === player.id ? "b" : null;
  const phaseKey = room ? `${room.turn}:${room.phase}` : "";
  useEffect(() => { draft.current = ""; }, [phaseKey]);

  const act = useCallback(
    async (action: Action, silent = false) => {
      setBusy(true);
      try {
        const res = await api.act(code, action, player?.token);
        accept(res.room);
      } catch (e) {
        if (!silent) setToast(e instanceof ApiError ? e.message : "Network hiccup. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [code, player, accept],
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
        !seat && !room.player_b ? (
          <JoinInline code={code} player={player} register={register} accept={accept} host={room.player_a} />
        ) : (
          <div className="space-y-5 px-4 py-8 text-center">
            <p className="font-display text-xl text-bone">Waiting for a challenger</p>
            <div className="mx-auto w-fit rounded-3xl bg-bone p-3 shadow-[0_0_60px_-10px_rgb(255_210_63/0.5)]">
              <JoinQR code={room.code} size={190} />
            </div>
            <p className="text-sm text-zinc-400">Scan it, or join with the code</p>
            <p className="font-display text-6xl tracking-[0.12em] text-spot">{room.code}</p>
            <CopyLink code={room.code} />
            <Link href={`/room/${room.code}/screen`} target="_blank" className="inline-block pt-2 text-sm text-sky-400 underline">
              📺 Open the projector view
            </Link>
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
          <Post name={baiter} text={room.bait ?? ""} meta="just now" big corner="fire" />
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
          <Post name={baiter} text={room.bait || <i className="text-zinc-500">(posted nothing)</i>} meta="bait" corner="fire" />
          {room.ignored ? (
            <p className="px-6 py-2 text-sm italic text-zinc-500">{replier} scrolled past 🧘</p>
          ) : (
            <Post name={replier} text={room.reply ?? ""} meta="replying" corner="ice" />
          )}
          <JudgeCooking />
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
                {room.turn + 1 >= TOTAL_TURNS ? "Final results" : "Next round: swap corners"}
              </Button>
            ) : (
              <p className="text-sm text-zinc-500">Waiting for the players…</p>
            )}
          </div>
        </>
      )}

      {/* ---------- RECAP ---------- */}
      {room.phase === "recap" && <Recap room={room} turns={turns} seat={seat} token={player?.token ?? null} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-fire px-5 py-2 text-sm font-semibold text-night shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}

// ---------- pieces ----------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-transparent text-zinc-100">
      <div className="mx-auto min-h-screen max-w-xl pb-10">{children}</div>
    </main>
  );
}

function Header({ room, seat, role }: { room: Room; seat: "a" | "b" | null; role: string | null }) {
  const round = Math.min(GAME.MATCH_ROUNDS, room.turn + 1);
  const fighting = room.phase !== "lobby" && room.phase !== "recap";
  const cornerOf = (s: "a" | "b"): "fire" | "ice" | undefined => (!fighting ? undefined : baiterSeat(room.turn) === s ? "fire" : "ice");
  return (
    <header className="sticky top-0 z-40 bg-night/85 px-3 pb-3 pt-2 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link href="/" className="marquee-sm text-lg" aria-label="Bait Arena home">BAIT ARENA</Link>
        <div className="flex items-center gap-2">
          {role === "spectating" && <Pill>Watching 👀</Pill>}
          <span className="font-display text-xs tracking-widest text-zinc-500">{room.code}</span>
          <SoundToggle />
        </div>
      </div>
      {room.player_b ? (
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <CornerCard name={room.player_a} score={room.score_a} elo={room.elo_a} me={seat === "a"} corner={cornerOf("a")} />
          <div className="flex flex-col items-center justify-center px-1">
            <span className="font-display text-2xl leading-none text-spot">VS</span>
            <span className="mt-1 whitespace-nowrap text-[11px] font-semibold text-zinc-400">
              {room.phase === "recap" ? "Final" : `Round ${round} of ${GAME.MATCH_ROUNDS}`}
            </span>
          </div>
          <CornerCard name={room.player_b} score={room.score_b} elo={room.elo_b} me={seat === "b"} corner={cornerOf("b")} right />
        </div>
      ) : null}
      {role && role !== "spectating" && (room.phase === "bait" || room.phase === "reply") && (
        <p className={`mt-2 rounded-lg py-1 text-center text-xs font-bold ${role === "baiting" ? "bg-fire/15 text-rose-300" : "bg-ice/15 text-emerald-300"}`}>
          {role === "baiting" ? "🔥 You're in the red corner: post the bait" : "🧊 You're in the blue corner: don't take the bait"}
        </p>
      )}
    </header>
  );
}

/** One side of the tale-of-the-tape scoreboard. Glows red/blue for whoever is baiting/defending this round. */
function CornerCard({
  name, score, elo, me, corner, right,
}: { name: string; score: number; elo: number | null; me: boolean; corner?: "fire" | "ice"; right?: boolean }) {
  const skin =
    corner === "fire" ? "border-fire bg-fire/15" : corner === "ice" ? "border-ice bg-ice/15" : "border-zinc-800 bg-canvas";
  return (
    <div className={`min-w-0 rounded-2xl border-2 px-2.5 py-2 transition-colors ${skin} ${right ? "text-right" : ""}`}>
      <div className={`flex min-w-0 items-center gap-2 ${right ? "flex-row-reverse" : ""}`}>
        <Avatar name={name} size={26} corner={corner} />
        <p className="min-w-0 truncate text-sm font-bold leading-tight">{name}{me ? " (you)" : ""}</p>
      </div>
      <div className={`mt-1.5 flex items-end justify-between gap-1 ${right ? "flex-row-reverse" : ""}`}>
        <span className="min-w-0 truncate"><TierBadge elo={elo} /></span>
        <span className="font-display text-2xl leading-none text-spot">{score}</span>
      </div>
    </div>
  );
}

/** The round card: which category everyone is fighting over. */
function TopicBanner({ topic }: { topic: string | null }) {
  const cat = getCategory(topic);
  return (
    <div className="mx-3 mt-3 rounded-2xl bg-canvas px-4 py-4 text-center">
      <p className="text-4xl leading-none" aria-hidden>{cat.emoji}</p>
      <p className="mt-2 font-display text-2xl leading-tight text-bone">{cat.label}</p>
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
    <div className="mx-3 mt-3 flex items-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => setI((prev) => (prev === null ? Math.floor(Math.random() * takes.length) : (prev + 1) % takes.length))}
        className="shrink-0 rounded-full border-2 border-zinc-700 px-3 py-1 font-semibold text-zinc-200 hover:border-spot"
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
    <div className="flex items-center justify-center gap-3 px-4 py-10 text-zinc-400">
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
  code, player, register, accept, host,
}: {
  code: string;
  player: StoredPlayer | null;
  register: (username: string) => Promise<StoredPlayer>;
  accept: (r: Room) => void;
  host: string;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(p: StoredPlayer) {
    const { room } = await api.joinRoom(p.token, code);
    accept(room);
  }

  return (
    <div className="space-y-5 px-6 py-12 text-center">
      <h2 className="font-display text-2xl">@{host} challenged you 🎣</h2>
      {player ? (
        <>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await join(player);
              } catch (e) {
                setErr(e instanceof ApiError ? e.message : "Couldn't join.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Joining…" : `Join as @${player.username}`}
          </Button>
          {err && <p className="text-sm text-rose-400">{err}</p>}
        </>
      ) : (
        <UsernameForm cta="Join the battle" onSubmit={async (u) => join(await register(u))} />
      )}
    </div>
  );
}

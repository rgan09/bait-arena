"use client";
// Projector view: everything big, nothing clickable except the sound button.
// The audience watches this while the two players use their phones.
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/feed";
import { JoinQR } from "@/components/JoinQR";
import { JudgeCooking } from "@/components/JudgeCooking";
import { TierBadge } from "@/components/TierBadge";
import { useNow, useRoom } from "@/hooks/useRoom";
import { useRoomSfx } from "@/hooks/useRoomSfx";
import { api } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import { audioUnlocked, unlockAudio } from "@/lib/sfx";
import type { Room, TurnRecord } from "@/lib/types";
import { GAME, TOTAL_TURNS } from "@/server/engine/config";
import { baitVerdict, matchWinner } from "@/server/engine/scoring";

const baiterSeat = (turn: number) => (turn % 2 === 0 ? "a" : "b");
const nameOf = (room: Room, seat: "a" | "b") => (seat === "a" ? room.player_a : room.player_b ?? "???");

export default function ScreenClient({ code }: { code: string }) {
  const { room, turns, error } = useRoom(code);
  const now = useNow();
  useRoomSfx(room, now);
  const fired = useRef("");
  const [soundOn, setSoundOn] = useState(false);

  // The projector also nudges timers forward (no login needed for timeouts), so the game
  // keeps moving even if a phone locks its screen.
  useEffect(() => {
    if (!room?.phase_ends_at || !["bait", "reply", "judging", "result"].includes(room.phase)) return;
    const key = `${room.turn}:${room.phase}`;
    if (new Date(room.phase_ends_at).getTime() - now > -2500 || fired.current === key) return;
    fired.current = key;
    api.act(code, { type: "timeout" }).catch(() => {});
  }, [now, room, code]);

  if (!room) {
    return <Frame><p className="m-auto text-3xl text-zinc-500">{error ?? "Loading…"}</p></Frame>;
  }

  const baiter = nameOf(room, baiterSeat(room.turn));
  const replier = nameOf(room, baiterSeat(room.turn) === "a" ? "b" : "a");
  const cat = getCategory(room.topic);

  return (
    <Frame>
      {!soundOn && (
        <button
          onClick={() => { unlockAudio(); setTimeout(() => setSoundOn(audioUnlocked()), 100); }}
          className="fixed right-6 top-6 z-50 rounded-full bg-sky-500 px-5 py-2 text-lg font-bold text-white shadow-lg"
        >
          🔊 Click to enable sound
        </button>
      )}

      {room.phase !== "lobby" && <Scoreboard room={room} />}

      {room.phase === "lobby" && (
        <div className="m-auto grid w-full max-w-6xl grid-cols-2 items-center gap-16">
          <div className="space-y-6">
            <h1 className="text-8xl font-black leading-none">🎣 Bait<br />Arena</h1>
            <p className="text-3xl text-zinc-400">1v1 hot-take battle</p>
            <div className="flex items-center gap-4 text-3xl">
              <Avatar name={room.player_a} size={64} />
              <span className="font-bold">@{room.player_a}</span>
              <TierBadge elo={room.elo_a} size="md" />
            </div>
            <p className="animate-pulse text-3xl text-zinc-500">vs … waiting for a challenger</p>
          </div>
          <div className="space-y-4 text-center">
            <JoinQR code={room.code} size={380} />
            <p className="text-2xl text-zinc-400">Scan to join, or enter code</p>
            <p className="font-mono text-9xl font-black tracking-[0.15em] text-sky-400">{room.code}</p>
          </div>
        </div>
      )}

      {(room.phase === "bait" || room.phase === "reply" || room.phase === "judging") && (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 py-8">
          <div className="text-center">
            <p className="text-xl uppercase tracking-[0.3em] text-zinc-500">Round {room.turn + 1} of {GAME.MATCH_ROUNDS}</p>
            <p className="text-7xl font-black">{cat.emoji} {cat.label}</p>
            <p className="mt-2 text-2xl text-zinc-400">{cat.prompt}</p>
          </div>
          {room.phase !== "judging" && (
            <BigTimer endsAt={room.phase_ends_at} total={room.phase === "bait" ? room.bait_seconds : room.reply_seconds} now={now} />
          )}

          {room.phase === "bait" && <Waiting name={baiter} text="is cooking up a hot take" />}

          {room.phase !== "bait" && <BigPost name={baiter} text={room.bait || "(posted nothing)"} />}

          {room.phase === "reply" && <Waiting name={replier} text="is deciding whether to take the bait…" />}

          {room.phase === "judging" && (
            <>
              {room.ignored
                ? <p className="text-center text-3xl italic text-zinc-500">{replier} scrolled past 🧘</p>
                : <BigPost name={replier} text={room.reply ?? ""} reply />}
              <JudgeCooking big />
            </>
          )}
        </div>
      )}

      {room.phase === "result" && room.last_turn && <BigResult turn={room.last_turn} room={room} now={now} />}

      {room.phase === "recap" && <BigRecap room={room} turns={turns} />}
    </Frame>
  );
}

// ---------- pieces ----------

function Frame({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col bg-black px-12 py-8 text-zinc-100">{children}</main>;
}

function Scoreboard({ room }: { room: Room }) {
  const p = (seat: "a" | "b") => ({
    name: seat === "a" ? room.player_a : room.player_b ?? "",
    score: seat === "a" ? room.score_a : room.score_b,
    elo: seat === "a" ? room.elo_a : room.elo_b,
    baiting: room.phase !== "recap" && baiterSeat(room.turn) === seat,
  });
  return (
    <div className="flex items-center justify-between gap-8 border-b border-zinc-800 pb-6">
      {(["a", "b"] as const).map((seat, i) => {
        const x = p(seat);
        return (
          <div key={seat} className={`flex items-center gap-5 ${i ? "flex-row-reverse text-right" : ""}`}>
            <Avatar name={x.name} size={72} />
            <div>
              <p className="text-3xl font-bold">@{x.name}</p>
              <div className={`mt-1 flex items-center gap-2 ${i ? "justify-end" : ""}`}>
                <TierBadge elo={x.elo} size="md" />
                {x.baiting && <span className="rounded-full bg-rose-500/20 px-3 py-0.5 text-base font-bold text-rose-300">🔥 baiting</span>}
              </div>
            </div>
            <span className="font-mono text-7xl font-black text-sky-400">{x.score}</span>
          </div>
        );
      })}
    </div>
  );
}

function BigTimer({ endsAt, total, now }: { endsAt: string | null; total: number; now: number }) {
  if (!endsAt) return null;
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  const secs = Math.ceil(left / 1000);
  const danger = secs <= 5;
  return (
    <div className="flex items-center gap-6">
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full transition-[width] duration-300 ease-linear ${danger ? "bg-rose-500" : "bg-sky-500"}`}
          style={{ width: `${Math.min(100, (left / (total * 1000)) * 100)}%` }} />
      </div>
      <span className={`w-28 text-right font-mono text-6xl font-black ${danger ? "animate-pulse text-rose-400" : ""}`}>{secs}s</span>
    </div>
  );
}

function Waiting({ name, text }: { name: string; text: string }) {
  return (
    <div className="flex items-center justify-center gap-5 py-10 text-4xl text-zinc-400">
      <Avatar name={name} size={64} />
      <span><b className="text-zinc-100">{name}</b> {text}</span>
      <span className="flex gap-2">
        {[0, 1, 2].map((i) => <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: `${i * 150}ms` }} />)}
      </span>
    </div>
  );
}

function BigPost({ name, text, reply }: { name: string; text: string; reply?: boolean }) {
  return (
    <div className={`flex animate-[fadeIn_.4s_ease-out] gap-5 rounded-3xl border p-8 ${reply ? "ml-24 border-zinc-800" : "border-zinc-700 bg-zinc-950"}`}>
      <Avatar name={name} size={64} />
      <div className="min-w-0">
        <p className="text-2xl text-zinc-400"><b className="text-zinc-100">@{name}</b>{reply ? " · replying" : ""}</p>
        <p className={`mt-2 break-words font-semibold leading-snug ${reply ? "text-4xl" : "text-5xl"}`}>{text}</p>
      </div>
    </div>
  );
}

function Bar({ label, value, color = "bg-sky-500" }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-4 text-2xl">
      <span className="w-48 text-zinc-400">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color} transition-[width] duration-1000`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className="w-10 text-right font-mono font-bold">{value}</span>
    </div>
  );
}

function BigResult({ turn, room, now }: { turn: TurnRecord; room: Room; now: number }) {
  const r = turn.result;
  const tookBait = !!r.response?.took_bait && !r.flagged_bait;
  const ratiod = !!r.response && !r.response.took_bait && r.response.ratio >= 8 && !r.flagged_response;
  const left = room.phase_ends_at ? Math.max(0, Math.ceil((new Date(room.phase_ends_at).getTime() - now) / 1000)) : null;

  return (
    <div className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-2 gap-10 py-8">
      {(tookBait || ratiod) && (
        <div className={`pointer-events-none absolute right-0 top-4 z-10 rotate-12 animate-[stamp_.5s_cubic-bezier(.2,1.6,.4,1)] rounded-2xl border-8 bg-black/80 px-8 py-3 text-6xl font-black uppercase tracking-widest ${tookBait ? "border-rose-500 text-rose-500" : "border-emerald-400 text-emerald-400"}`}>
          {tookBait ? "Took the bait 🎣" : "Ratio'd 💀"}
        </div>
      )}
      <div className="space-y-6">
        <BigPost name={turn.baiter} text={turn.bait || "(posted nothing)"} />
        {turn.ignored
          ? <p className="text-center text-3xl italic text-zinc-500">{turn.replier} scrolled past 🧘</p>
          : <BigPost name={turn.replier} text={turn.reply ?? ""} reply />}
      </div>
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="text-3xl font-bold">🔥 {turn.baiter} <span className="text-sky-400">+{turn.bait_points}</span> <span className="text-xl text-amber-300">{r.flagged_bait ? "🚩 FOUL" : baitVerdict(turn.bait_points)}</span></p>
          <Bar label="Provocation" value={r.bait.provocation} />
          <Bar label="Plausibility" value={r.bait.plausibility} />
          <Bar label="Creativity" value={r.bait.creativity} />
          <p className="rounded-2xl bg-zinc-900 p-5 text-3xl leading-snug">{r.roast}</p>
        </div>
        <div className="space-y-3">
          <p className="text-3xl font-bold">🧊 {turn.replier} <span className="text-emerald-400">+{turn.reply_points}</span></p>
          <Bar label="Composure" value={r.response?.composure ?? 7} color="bg-emerald-500" />
          {r.response && <Bar label="Ratio" value={r.response.ratio} color="bg-violet-500" />}
          {r.roast_response && <p className="rounded-2xl bg-zinc-900 p-5 text-3xl leading-snug">{r.roast_response}</p>}
        </div>
        {left !== null && (
          <p className="text-right text-xl text-zinc-500">{room.turn + 1 >= TOTAL_TURNS ? "Final results" : "Next round"} in {left}s</p>
        )}
      </div>
    </div>
  );
}

function BigRecap({ room, turns }: { room: Room; turns: TurnRecord[] }) {
  const w = room.winner ?? matchWinner({ a: room.player_a, b: room.player_b ?? "" }, { a: room.score_a, b: room.score_b }, turns);
  const winner = w === "a" ? room.player_a : w === "b" ? room.player_b : null;
  const best = [...turns].sort((x, y) => y.bait_points - x.bait_points)[0];
  const elo = room.elo_result;

  return (
    <div className="m-auto grid w-full max-w-7xl grid-cols-2 items-center gap-16 py-8">
      <div className="space-y-6 text-center">
        {winner ? (
          <>
            <div className="flex justify-center"><Avatar name={winner} size={140} /></div>
            <h2 className="text-8xl font-black">{winner}<br />wins 👑</h2>
          </>
        ) : (
          <h2 className="text-8xl font-black">Dead even 🤝</h2>
        )}
        {elo && (
          <div className="flex justify-center gap-10 font-mono text-3xl">
            {(["a", "b"] as const).map((s) => {
              const d = elo[s].after - elo[s].before;
              return (
                <div key={s} className="space-y-2">
                  <p className="font-sans font-bold">@{s === "a" ? room.player_a : room.player_b}</p>
                  <p>{elo[s].before} → <b>{elo[s].after}</b> <span className={d >= 0 ? "text-emerald-400" : "text-rose-400"}>({d >= 0 ? "+" : ""}{d})</span></p>
                  <TierBadge elo={elo[s].after} size="md" />
                </div>
              );
            })}
          </div>
        )}
      </div>
      {best && best.bait && (
        <div className="space-y-4 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-10">
          <p className="text-2xl font-bold text-amber-300">🏆 Hottest take</p>
          <p className="text-2xl text-zinc-400">@{best.baiter} · {getCategory(best.topic).emoji} {getCategory(best.topic).label}</p>
          <p className="text-5xl font-semibold leading-tight">“{best.bait}”</p>
          <p className="text-3xl text-zinc-300">🔥 {best.result.roast}</p>
        </div>
      )}
    </div>
  );
}

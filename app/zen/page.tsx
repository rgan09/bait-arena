"use client";
// Zen Mode: the AI baits you, you practise replying calmly. Solo, no account needed.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { Button, Countdown, Pill, Post, ScoreBar } from "@/components/feed";
import { CATEGORIES, getCategory, randomCategoryId } from "@/lib/categories";
import {
  addPoints, DIFFICULTY_LABEL, difficultyFor, ZEN, zenPoints,
  type ZenBait, type ZenCoach, type ZenOutcome,
} from "@/lib/zen";

type Phase = "intro" | "loading" | "reply" | "coaching" | "review" | "error" | "over";

interface Round {
  bait: ZenBait;
  poster: string;
  response: string | null;
  coach: ZenCoach;
  points: number;
  outcome: ZenOutcome;
}

const POSTERS = [
  "hot_take_harold", "certified_contrarian", "lowkey_wrong", "takes_r_us", "unbothered_not",
  "devils_advocate_dan", "just_asking_qs", "chronically_correct", "opinion_haver", "well_actually_wendy",
];
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

const BEST_KEY = "bait:zen:best";
function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(n: number) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch {}
}

class ZenError extends Error {}
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  if (!res) throw new ZenError("Network hiccup. Try again.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ZenError(data?.error?.message ?? "Something went wrong.");
  return data as T;
}

/** Ticks while `active`. Starts at 0 and reads the clock only in the browser (Next prerenders this page). */
function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync to the real clock as soon as the timer starts
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

export default function ZenPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [choice, setChoice] = useState<string>("any");
  const [current, setCurrent] = useState<{ bait: ZenBait; poster: string } | null>(null);
  const [next, setNext] = useState<ZenBait | null>(null);
  const [endsAt, setEndsAt] = useState(0);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState<number>(ZEN.LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [best, setBest] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const draft = useRef("");
  const fired = useRef(-1);
  const pending = useRef<string | null>(null);
  const now = useNow(phase === "reply");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration
  useEffect(() => setBest(loadBest()), []);

  const showBait = useCallback((bait: ZenBait) => {
    setCurrent({ bait, poster: pick(POSTERS) });
    setEndsAt(Date.now() + ZEN.REPLY_SECONDS * 1000);
    draft.current = "";
    setPhase("reply");
  }, []);

  async function start() {
    setIndex(0); setLives(ZEN.LIVES); setScore(0); setStreak(0); setRounds([]); setNext(null); setError(null);
    fired.current = -1;
    setPhase("loading");
    try {
      const bait = await post<ZenBait>("/api/zen/bait", {
        category: choice === "any" ? undefined : choice,
        difficulty: difficultyFor(0),
      });
      showBait(bait);
    } catch (e) {
      setError((e as Error).message);
      setPhase("intro");
    }
  }

  const submit = useCallback(
    async (response: string | null) => {
      if (!current) return;
      pending.current = response;
      setPhase("coaching");
      setError(null);
      const nextCategory = choice === "any" ? randomCategoryId(current.bait.category) : choice;
      try {
        const res = await post<{ coach: ZenCoach; next: ZenBait }>("/api/zen/coach", {
          category: current.bait.category,
          difficulty: current.bait.difficulty,
          bait: current.bait.bait,
          response: response?.trim() ? response : null,
          next_category: nextCategory,
          next_difficulty: difficultyFor(index + 1),
        });
        const { points, lifeLost, outcome } = zenPoints(res.coach);
        setRounds((rs) => [...rs, {
          bait: current.bait, poster: current.poster,
          response: res.coach.response ? response : null,
          coach: res.coach, points, outcome,
        }]);
        setScore((s) => addPoints(s, points));
        setLives((l) => (lifeLost ? l - 1 : l));
        setStreak((s) => (outcome === "calm" ? s + 1 : 0));
        setNext(res.next);
        setPhase("review");
      } catch (e) {
        setError((e as Error).message);
        setPhase("error");
      }
    },
    [current, choice, index],
  );

  // Time's up: post whatever's typed, or count it as an ignore.
  useEffect(() => {
    if (phase !== "reply" || now < endsAt || fired.current === index) return;
    fired.current = index;
    submit(draft.current.trim() || null);
  }, [phase, now, endsAt, index, submit]);

  function advance() {
    if (lives <= 0 || !next) {
      if (score > best) { setBest(score); saveBest(score); }
      setPhase("over");
      return;
    }
    setIndex((i) => i + 1);
    showBait(next);
  }

  const last = rounds[rounds.length - 1];

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto min-h-screen max-w-xl border-x border-zinc-800">
        <Header phase={phase} lives={lives} score={score} streak={streak} difficulty={current?.bait.difficulty} />

        {phase === "intro" && (
          <Intro choice={choice} setChoice={setChoice} best={best} error={error} onStart={start} />
        )}

        {phase === "loading" && <Spinner label="Finding someone wrong on the internet…" />}

        {phase === "reply" && current && (
          <>
            <CategoryBanner id={current.bait.category} />
            <Countdown endsAt={new Date(endsAt).toISOString()} total={ZEN.REPLY_SECONDS} now={now} />
            <Post name={current.poster} text={current.bait.bait} meta="just now" big />
            <Composer
              key={`zen-${index}`}
              name="you"
              placeholder="Reply calmly. Short, unbothered, maybe funny."
              submitLabel="Reply"
              onDraft={(t) => (draft.current = t)}
              onSubmit={(text) => { fired.current = index; submit(text); }}
              extra={
                <Button variant="ghost" onClick={() => { fired.current = index; submit(null); }}>
                  Ignore (−{ZEN.IGNORE_PENALTY})
                </Button>
              }
            />
            <p className="px-4 py-3 text-xs text-zinc-600">
              The goal is a calm reply. Ignoring is safe but costs {ZEN.IGNORE_PENALTY} points.
            </p>
          </>
        )}

        {phase === "coaching" && current && (
          <>
            <CategoryBanner id={current.bait.category} />
            <Post name={current.poster} text={current.bait.bait} meta="bait" />
            <Spinner label="🧘 Your coach is reading your reply…" />
          </>
        )}

        {phase === "error" && (
          <div className="space-y-4 px-4 py-16 text-center">
            <p className="text-rose-300">{error}</p>
            <Button onClick={() => submit(pending.current)}>Try again</Button>
          </div>
        )}

        {phase === "review" && last && (
          <Review round={last} livesLeft={lives} onNext={advance} />
        )}

        {phase === "over" && (
          <GameOver rounds={rounds} score={score} best={best} onAgain={() => setPhase("intro")} />
        )}
      </div>
    </main>
  );
}

// ---------- pieces ----------

function Header({ phase, lives, score, streak, difficulty }: {
  phase: Phase; lives: number; score: number; streak: number; difficulty?: 1 | 2 | 3;
}) {
  const playing = phase !== "intro" && phase !== "over";
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-black tracking-tight">🧘 Zen Mode</Link>
        {playing && difficulty && <Pill tone="sky">{DIFFICULTY_LABEL[difficulty]}</Pill>}
      </div>
      {playing && (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span aria-label={`${lives} lives left`} className="tracking-widest">
            {Array.from({ length: ZEN.LIVES }, (_, i) => (i < lives ? "💚" : "🖤")).join("")}
          </span>
          {streak > 1 && <span className="text-xs font-semibold text-emerald-300">🧊 {streak} calm in a row</span>}
          <span className="font-mono text-lg font-bold">{score}</span>
        </div>
      )}
    </header>
  );
}

function Intro({ choice, setChoice, best, error, onStart }: {
  choice: string; setChoice: (c: string) => void; best: number; error: string | null; onStart: () => void;
}) {
  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setChoice(id)}
      className={`rounded-full border px-3 py-1 text-sm ${choice === id ? "border-sky-500 bg-sky-500/15 text-sky-200" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="space-y-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <div className="text-6xl">🧘</div>
        <h1 className="text-4xl font-black">Don&apos;t take the bait</h1>
        <p className="text-zinc-400">The AI posts ragebait. You reply without losing your cool. A coach shows you the hook and a better comeback.</p>
      </div>

      <ul className="space-y-2 rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-300">
        <li>🧊 <b>Calm, clever reply:</b> up to 30 points</li>
        <li>🎣 <b>Took the bait:</b> 0 points and you lose a life ({ZEN.LIVES} lives)</li>
        <li>🙈 <b>Ignore:</b> −{ZEN.IGNORE_PENALTY} points. Safe, but it isn&apos;t practice.</li>
        <li>⏱️ {ZEN.REPLY_SECONDS}s per bait, and it gets harder as you go.</li>
      </ul>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Category</p>
        <div className="flex flex-wrap gap-2">
          {chip("any", "🎲 Any")}
          {CATEGORIES.map((c) => chip(c.id, `${c.emoji} ${c.label}`))}
        </div>
      </div>

      {error && <p className="text-center text-sm text-rose-400">{error}</p>}
      <div className="flex flex-col items-center gap-2">
        <Button onClick={onStart}>Start training</Button>
        {best > 0 && <p className="text-xs text-zinc-500">Your best: {best}</p>}
      </div>
    </div>
  );
}

function CategoryBanner({ id }: { id: string }) {
  const c = getCategory(id);
  return (
    <div className="border-b border-zinc-800 px-4 py-3 text-center">
      <p className="text-xl font-black">{c.emoji} {c.label}</p>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-sky-500" />
      <p>{label}</p>
    </div>
  );
}

const OUTCOME: Record<ZenOutcome, { stamp: string; tone: string }> = {
  calm: { stamp: "Stayed calm 🧊", tone: "border-emerald-400 text-emerald-400" },
  took_bait: { stamp: "Took the bait 🎣", tone: "border-rose-500 text-rose-500" },
  ignored: { stamp: "Ignored 🙈", tone: "border-amber-400 text-amber-400" },
  flagged: { stamp: "Foul 🚩", tone: "border-rose-500 text-rose-500" },
};

function Review({ round, livesLeft, onNext }: { round: Round; livesLeft: number; onNext: () => void }) {
  const { coach, outcome, points } = round;
  const o = OUTCOME[outcome];
  return (
    <div className="animate-[fadeIn_.4s_ease-out]">
      <CategoryBanner id={round.bait.category} />
      <Post name={round.poster} text={round.bait.bait} meta="bait" />
      {round.response === null ? (
        <div className="border-b border-zinc-800 px-4 py-3 text-sm italic text-zinc-500">You scrolled past without replying 🙈</div>
      ) : (
        <Post name="you" text={round.response} meta="replying" />
      )}

      <section className="relative space-y-5 px-4 py-5">
        <div className={`pointer-events-none absolute right-3 top-2 z-10 rotate-12 animate-[stamp_.5s_cubic-bezier(.2,1.6,.4,1)] rounded-lg border-4 bg-black/70 px-3 py-1 text-lg font-black uppercase tracking-widest ${o.tone}`}>
          {o.stamp}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={points > 0 ? "emerald" : points < 0 ? "amber" : "rose"}>{points > 0 ? `+${points}` : points}</Pill>
          {outcome === "took_bait" || outcome === "flagged" ? <Pill tone="rose">−1 life</Pill> : null}
          <Pill tone="sky">🪝 {coach.hook}</Pill>
        </div>

        {coach.response && (
          <div className="space-y-2">
            <ScoreBar label="Composure" value={coach.response.composure} accent="bg-emerald-500" />
            <ScoreBar label="Ratio" value={coach.response.ratio} accent="bg-violet-500" />
          </div>
        )}

        {coach.flagged_response && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            🚩 Roast the take, not the person. That reply scores 0.
          </div>
        )}

        <p className="rounded-xl bg-zinc-900 p-3 text-zinc-200">🧘 {coach.verdict}</p>
        <p className="rounded-xl bg-zinc-900 p-3 text-zinc-200">💡 {coach.tip}</p>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Try a reply like</p>
          <p className="mt-1 text-lg text-zinc-100">“{coach.better_reply}”</p>
        </div>

        {coach.source === "fallback" && (
          <p className="text-center text-xs text-zinc-600">The AI coach was busy, so this one used backup scoring.</p>
        )}

        <div className="flex justify-center pt-2">
          <Button onClick={onNext}>{livesLeft <= 0 ? "See results →" : "Next bait →"}</Button>
        </div>
      </section>
    </div>
  );
}

function GameOver({ rounds, score, best, onAgain }: { rounds: Round[]; score: number; best: number; onAgain: () => void }) {
  const calm = rounds.filter((r) => r.outcome === "calm").length;
  const ignored = rounds.filter((r) => r.outcome === "ignored").length;
  const gotYou = [...new Set(rounds.filter((r) => r.outcome === "took_bait" || r.outcome === "flagged").map((r) => r.coach.hook))];
  const newBest = score > 0 && score >= best;

  return (
    <div className="space-y-6 px-4 py-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Training over</p>
      <p className="font-mono text-6xl font-black text-sky-400">{score}</p>
      <p className="text-zinc-400">{newBest ? "New personal best 🎉" : `Best: ${best}`}</p>

      <div className="mx-auto grid max-w-sm grid-cols-3 gap-2 text-sm">
        <Stat label="Baits" value={rounds.length} />
        <Stat label="Calm replies" value={calm} />
        <Stat label="Ignored" value={ignored} />
      </div>

      {gotYou.length > 0 && (
        <div className="mx-auto max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">Hooks that got you</p>
          <p className="mt-2 text-zinc-200">{gotYou.join(" · ")}</p>
          <p className="mt-2 text-sm text-zinc-500">Watch for these next time. Spotting the hook is half the battle.</p>
        </div>
      )}

      <div className="mx-auto max-w-md space-y-2 text-left">
        {rounds.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm">
            <span className="truncate text-zinc-300">{OUTCOME[r.outcome].stamp} · {r.coach.hook}</span>
            <span className="shrink-0 font-mono text-zinc-400">{r.points > 0 ? `+${r.points}` : r.points}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button onClick={onAgain}>Train again</Button>
        <Link href="/" className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800">Home</Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 p-3">
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

"use client";
// Spot the Bait: 10 quick-fire posts. Swipe right (or →) for bait, left (or ←) for sincere.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Button, Pill } from "@/components/feed";
import { SoundToggle } from "@/components/SoundToggle";
import { getLesson } from "@/lib/lessons";
import { sfx, unlockAudio } from "@/lib/sfx";
import { dealRound, SPOT, spotTitle, type SpotCard } from "@/lib/spot";

type Answer = { card: SpotCard; guessBait: boolean | null; correct: boolean };
const BEST_KEY = "bait:spot:best";
const HANDLES = ["daily_thoughts", "campus_life", "just_saying", "random_human", "tl_dr", "a_person", "hot_takes_only", "notes_app"];

export default function SpotPage() {
  const [deck, setDeck] = useState<SpotCard[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [reveal, setReveal] = useState<Answer | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage after hydration
  useEffect(() => { try { const b = localStorage.getItem(BEST_KEY); setBest(b == null ? null : Number(b)); } catch {} }, []);

  const start = () => {
    unlockAudio();
    setDeck(dealRound());
    setI(0);
    setAnswers([]);
    setReveal(null);
    setDeadline(Date.now() + SPOT.SECONDS_PER_CARD * 1000);
  };

  const playing = deck !== null && i < deck.length;
  const done = deck !== null && i >= deck.length;
  const card = playing ? deck[i] : null;

  const answer = useCallback((guessBait: boolean | null) => {
    if (!card || reveal) return;
    const a: Answer = { card, guessBait, correct: guessBait === card.isBait };
    if (a.correct) sfx.ding(); else sfx.pop();
    setAnswers((xs) => [...xs, a]);
    setReveal(a);
    setDrag(0);
  }, [card, reveal]);

  const next = useCallback(() => {
    if (!deck) return;
    setReveal(null);
    const n = i + 1;
    setI(n);
    setDeadline(Date.now() + SPOT.SECONDS_PER_CARD * 1000);
    if (n >= deck.length) {
      const score = answers.filter((a) => a.correct).length;
      if (score === deck.length) sfx.win();
      try {
        const prev = Number(localStorage.getItem(BEST_KEY) ?? -1);
        if (score > prev) { localStorage.setItem(BEST_KEY, String(score)); setBest(score); }
      } catch {}
    }
  }, [deck, i, answers]);

  // Clock + timeout per card (checked inside the timer, so no state is set from an effect body).
  const latest = useRef({ deadline, reveal, answer });
  useEffect(() => { latest.current = { deadline, reveal, answer }; });
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const l = latest.current;
      if (!l.reveal && t > l.deadline) l.answer(null);
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  // Keyboard: ← sincere, → bait, Enter/space to continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reveal && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); next(); return; }
      if (e.key === "ArrowRight") answer(true);
      if (e.key === "ArrowLeft") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, next, reveal]);

  const correct = answers.filter((a) => a.correct).length;
  const left = Math.max(0, deadline - now);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col border-x border-zinc-800">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur">
          <Link href="/" className="text-lg font-black tracking-tight">🎣 Bait Arena</Link>
          <div className="flex items-center gap-2">
            {playing && <Pill>{i + 1}/{deck!.length} · ✅ {correct}</Pill>}
            <SoundToggle />
          </div>
        </header>

        {!deck && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="text-6xl">🕵️</div>
            <h1 className="text-4xl font-black">Spot the Bait</h1>
            <p className="text-zinc-400">
              {SPOT.ROUND_SIZE} posts, {SPOT.SECONDS_PER_CARD} seconds each. Is it a <b className="text-zinc-200">sincere</b> post or <b className="text-zinc-200">ragebait</b>?
            </p>
            <div className="grid w-full grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">⬅️ Swipe left / ← key<br /><b>Sincere 🙂</b></div>
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3">Swipe right / → key ➡️<br /><b>Bait 🎣</b></div>
            </div>
            {best != null && <p className="text-sm text-zinc-500">Your best: {best}/{SPOT.ROUND_SIZE}</p>}
            <Button onClick={start}>Start</Button>
          </div>
        )}

        {playing && card && (
          <div className="flex flex-1 flex-col px-4 py-6">
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${left < 2500 ? "bg-rose-500" : "bg-sky-500"}`}
                style={{ width: `${reveal ? 0 : (left / (SPOT.SECONDS_PER_CARD * 1000)) * 100}%` }} />
            </div>

            <div
              key={card.id}
              onPointerDown={(e) => { if (!reveal) dragStart.current = e.clientX; }}
              onPointerMove={(e) => { if (dragStart.current != null) setDrag(e.clientX - dragStart.current); }}
              onPointerUp={() => {
                if (dragStart.current == null) return;
                dragStart.current = null;
                if (drag > 80) answer(true); else if (drag < -80) answer(false); else setDrag(0);
              }}
              onPointerCancel={() => { dragStart.current = null; setDrag(0); }}
              style={{ transform: `translateX(${drag}px) rotate(${drag / 25}deg)`, touchAction: "pan-y" }}
              className={`relative animate-[fadeIn_.25s_ease-out] select-none rounded-3xl border p-6 transition-colors ${
                reveal ? (reveal.correct ? "border-emerald-500/60 bg-emerald-500/5" : "border-rose-500/60 bg-rose-500/5")
                  : drag > 40 ? "border-rose-500/50" : drag < -40 ? "border-emerald-500/50" : "border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={HANDLES[i % HANDLES.length]} size={40} />
                <p className="text-sm"><b>{HANDLES[i % HANDLES.length]}</b> <span className="text-zinc-500">· {i + 2}h</span></p>
              </div>
              <p className="mt-4 text-2xl leading-snug">{card.text}</p>
              {!reveal && drag > 40 && <span className="absolute right-4 top-4 rounded-lg border-2 border-rose-500 px-2 font-black text-rose-500">BAIT</span>}
              {!reveal && drag < -40 && <span className="absolute right-4 top-4 rounded-lg border-2 border-emerald-500 px-2 font-black text-emerald-500">SINCERE</span>}
            </div>

            {!reveal ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => answer(false)} className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 text-lg font-bold text-emerald-300 active:scale-95">🙂 Sincere</button>
                <button onClick={() => answer(true)} className="rounded-2xl border border-rose-500/40 bg-rose-500/10 py-4 text-lg font-bold text-rose-300 active:scale-95">🎣 Bait</button>
              </div>
            ) : (
              <div className="mt-6 space-y-3 text-center">
                <p className={`text-2xl font-black ${reveal.correct ? "text-emerald-400" : "text-rose-400"}`}>
                  {reveal.guessBait === null ? "⏰ Too slow!" : reveal.correct ? "✅ Correct" : "❌ Got you"}: it was {reveal.card.isBait ? "bait 🎣" : "sincere 🙂"}
                </p>
                {reveal.card.technique && <Pill tone="sky">{getLesson(reveal.card.technique)?.emoji} {getLesson(reveal.card.technique)?.title}</Pill>}
                <p className="text-zinc-300">{reveal.card.why}</p>
                <Button onClick={next}>{i + 1 >= deck!.length ? "See results" : "Next →"}</Button>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="flex-1 space-y-6 px-4 py-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">You spotted</p>
            <p className="font-mono text-7xl font-black text-sky-400">{correct}/{deck!.length}</p>
            <div>
              <p className="text-3xl font-black">{spotTitle(correct, deck!.length).title}</p>
              <p className="text-zinc-400">{spotTitle(correct, deck!.length).blurb}</p>
            </div>
            <div className="space-y-2 text-left">
              {answers.map((a) => (
                <div key={a.card.id} className="flex gap-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm">
                  <span>{a.correct ? "✅" : "❌"}</span>
                  <span className="flex-1 text-zinc-300">{a.card.text}</span>
                  <span className="shrink-0 text-zinc-500">{a.card.isBait ? "bait" : "sincere"}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={start}>Play again</Button>
              <Link href="/school" className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800">Bait School</Link>
              <Link href="/zen" className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800">Zen Mode</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

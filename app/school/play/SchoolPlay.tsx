"use client";
import Link from "next/link";
import { useState } from "react";
import { Composer } from "@/components/Composer";
import { Button, Pill, Post, ScoreBar } from "@/components/feed";
import { CommentFlood } from "@/components/school/CommentFlood";
import { CountUp } from "@/components/school/CountUp";
import { JudgeCooking } from "@/components/JudgeCooking";
import { SoundToggle } from "@/components/SoundToggle";
import { sfx, unlockAudio } from "@/lib/sfx";
import { usePlayer } from "@/hooks/usePlayer";
import { getCategory, randomCategoryId } from "@/lib/categories";
import { getLesson } from "@/lib/lessons";
import { engagement, saveDailyBest, schoolVerdict, todayKey } from "@/lib/school";
import type { SchoolPostResult } from "@/lib/types";

type Stage = { kind: "compose" } | { kind: "posting"; bait: string } | { kind: "result"; bait: string; result: SchoolPostResult; best: boolean };

export default function SchoolPlay({ category, technique, daily }: { category: string | null; technique: string | null; daily: boolean }) {
  const { player } = usePlayer();
  const [catId, setCatId] = useState(() => category ?? "food"); // deterministic default avoids a hydration mismatch
  const cat = getCategory(catId);
  const lesson = getLesson(technique);
  const [stage, setStage] = useState<Stage>({ kind: "compose" });
  const [attempt, setAttempt] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const me = player?.username ?? "you";

  async function post(bait: string) {
    setErr(null);
    unlockAudio();
    sfx.pop();
    setStage({ kind: "posting", bait });
    try {
      const res = await fetch("/api/school/post", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: catId, bait, technique: lesson?.id ?? null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Couldn't post.");
      const result = body as SchoolPostResult;
      const score = result.provocation + result.plausibility + result.creativity;
      const best = daily && !result.flagged ? saveDailyBest(todayKey(), score) : false;
      setStage({ kind: "result", bait, result, best });
      sfx.ding();
      if (!result.flagged && score >= 22) setTimeout(sfx.boom, 400); // the post went nuclear
    } catch (e) {
      setErr((e as Error).message);
      setStage({ kind: "compose" });
    }
  }

  function again(newCategory = false) {
    if (newCategory) setCatId(randomCategoryId(catId));
    setAttempt((a) => a + 1);
    setStage({ kind: "compose" });
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto min-h-screen max-w-xl border-x border-zinc-800">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur">
          <Link href="/school" className="text-sm font-semibold text-zinc-300 hover:text-white">← Bait School</Link>
          <div className="flex items-center gap-2">
            {daily ? <Pill tone="amber">Daily challenge</Pill> : lesson ? <Pill tone="sky">Practising</Pill> : <Pill>Free practice</Pill>}
            <SoundToggle />
          </div>
        </header>

        <div className="border-b border-zinc-800 px-4 py-4 text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">Category</span>
          <p className="text-3xl font-black">{cat.emoji} {cat.label}</p>
          <p className="mt-1 text-sm text-zinc-400">{cat.prompt}</p>
        </div>

        {lesson && (
          <details className="border-b border-zinc-800 bg-sky-500/5 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-sky-300">
              {lesson.emoji} Technique: {lesson.title} <span className="font-normal text-zinc-400">· {lesson.oneLiner}</span>
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-300">
              {lesson.recipe.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <p className="mt-2 text-zinc-400">Example: “{lesson.example.bait}”</p>
          </details>
        )}

        {stage.kind === "compose" && (
          <>
            <Inspo takes={cat.takes} key={`inspo-${catId}-${attempt}`} />
            <Composer
              key={`${catId}-${attempt}`}
              name={me}
              placeholder={lesson ? `Use “${lesson.title.toLowerCase()}” on ${cat.label.toLowerCase()}…` : "Drop your hottest take…"}
              submitLabel="Post"
              onSubmit={post}
            />
            {err && <p className="px-4 py-3 text-center text-sm text-rose-400">{err}</p>}
          </>
        )}

        {stage.kind === "posting" && (
          <>
            <Post name={me} text={stage.bait} meta="just now" big />
            <JudgeCooking lines={["📲 Posting…", "👀 The internet is reading it…", "⌨️ People are typing…", "🔥 Someone opened caps lock…"]} />
          </>
        )}

        {stage.kind === "result" && <Result me={me} stage={stage} lessonTitle={lesson?.title ?? null} onAgain={() => again(false)} onNew={() => again(true)} />}
      </div>
    </main>
  );
}

function Result({
  me, stage, lessonTitle, onAgain, onNew,
}: {
  me: string;
  stage: { bait: string; result: SchoolPostResult; best: boolean };
  lessonTitle: string | null;
  onAgain: () => void;
  onNew: () => void;
}) {
  const r = stage.result;
  const score = r.provocation + r.plausibility + r.creativity;
  // useState initialiser keeps the random-ish numbers stable across re-renders.
  const [eng] = useState(() => engagement(score, r.replies));

  return (
    <>
      <Post name={me} text={stage.bait} meta="just now" big>
        {!r.flagged && (
          <div className="mt-3 flex justify-between pr-6 text-sm text-zinc-500">
            <span>💬 <CountUp value={eng.replies} /></span>
            <span>🔁 <CountUp value={eng.quotes} /></span>
            <span>♡ <CountUp value={eng.likes} /></span>
            <span>📊 <CountUp value={eng.views} /></span>
          </div>
        )}
      </Post>

      <section className="space-y-4 border-b border-zinc-800 px-4 py-5">
        {r.flagged ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            🚩 <b>Foul:</b> bait the topic, not the person. No points, and no comment section.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-4xl font-black text-sky-400">{score}<span className="text-xl text-zinc-500">/30</span></span>
            <Pill tone="amber">{schoolVerdict(score)}</Pill>
            {stage.best && <Pill tone="emerald">🏅 New daily best</Pill>}
          </div>
        )}

        {r.technique_hit !== null && lessonTitle && (
          <p className={`rounded-xl p-3 text-sm ${r.technique_hit ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-900 text-zinc-400"}`}>
            {r.technique_hit ? `✅ Nailed it: that's a textbook ${lessonTitle.toLowerCase()}.` : `❌ That wasn't really ${lessonTitle.toLowerCase()}. Check the recipe and try again.`}
          </p>
        )}

        <div className="space-y-2">
          <ScoreBar label="Provocation" value={r.provocation} />
          <ScoreBar label="Plausibility" value={r.plausibility} />
          <ScoreBar label="Creativity" value={r.creativity} />
        </div>
        <p className="rounded-xl bg-zinc-900 p-3 text-zinc-200">🔥 {r.roast}</p>
        {r.source === "fallback" && <p className="text-center text-xs text-zinc-600">The AI instructor was busy, so this used backup scoring.</p>}

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button onClick={onAgain}>Try again</Button>
          <Button variant="ghost" onClick={onNew}>New category 🎲</Button>
          <Link href="/school" className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800">Lessons</Link>
        </div>
      </section>

      <CommentFlood replies={r.replies} extra={eng.extraReplies} />
    </>
  );
}

function Inspo({ takes }: { takes: string[] }) {
  const [i, setI] = useState<number | null>(null);
  if (!takes.length) return null;
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2 text-sm">
      <button
        type="button"
        onClick={() => setI((p) => (p === null ? Math.floor(Math.random() * takes.length) : (p + 1) % takes.length))}
        className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 font-semibold text-zinc-300 hover:bg-zinc-800"
      >
        Inspo 🎲
      </button>
      <span className="text-zinc-400">{i === null ? "Stuck? Get an example. (Copying it exactly kills your creativity score.)" : <i>“{takes[i]}”</i>}</span>
    </div>
  );
}

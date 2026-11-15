"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORIES, dailyCategoryId, getCategory } from "@/lib/categories";
import { LESSONS } from "@/lib/lessons";
import { loadDailyBest, todayKey } from "@/lib/school";

export default function SchoolPage() {
  // Date-dependent, so it's worked out in the browser (the player's local day), not at build time.
  const [day, setDay] = useState<{ categoryId: string; best: number | null } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the clock + localStorage after hydration
    setDay({ categoryId: dailyCategoryId(), best: loadDailyBest(todayKey()) });
  }, []);
  const daily = day ? getCategory(day.categoryId) : null;
  const best = day?.best ?? null;

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto min-h-screen max-w-xl border-x border-zinc-800">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur">
          <Link href="/" className="text-lg font-black tracking-tight">🎣 Bait Arena</Link>
          <span className="text-sm font-semibold text-zinc-400">🎓 Bait School</span>
        </header>

        <div className="px-4 py-6">
          <h1 className="text-4xl font-black">Bait School 🎓</h1>
          <p className="mt-2 text-zinc-400">
            Learn the 5 tricks every ragebait post uses. Once you can write it, you can spot it, and stop falling for it.
          </p>
        </div>

        {/* Daily challenge */}
        {daily ? (
        <section className="mx-4 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Daily challenge</p>
          <p className="mt-2 text-3xl font-black">{daily.emoji} {daily.label}</p>
          <p className="mt-1 text-sm text-zinc-400">{daily.prompt}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">
              {best == null ? "You haven't posted today." : <>Today&apos;s best: <b className="text-amber-300">{best}/30</b></>}
            </span>
            <Link
              href={`/school/play?category=${daily.id}&daily=1`}
              className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-black hover:bg-amber-400"
            >
              {best == null ? "Take the challenge" : "Beat your score"}
            </Link>
          </div>
        </section>
        ) : (
          <div className="mx-4 h-40 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900" />
        )}

        {/* Lessons */}
        <section className="px-4 pt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">The 5 techniques</p>
          <div className="space-y-3">
            {LESSONS.map((l, i) => (
              <details key={l.id} className="group rounded-2xl border border-zinc-800 open:border-sky-500/40 open:bg-sky-500/5">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="text-2xl">{l.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-xs text-zinc-500">Lesson {i + 1}</span>
                    <span className="block font-bold">{l.title}</span>
                    <span className="block text-sm text-zinc-400">{l.oneLiner}</span>
                  </span>
                  <span className="text-zinc-500 transition group-open:rotate-90">›</span>
                </summary>
                <div className="space-y-4 px-4 pb-5">
                  <p className="text-sm text-zinc-300"><b>Why it works:</b> {l.why}</p>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
                    {l.recipe.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                    <p className="text-xs text-zinc-500">Example · {getCategory(l.example.category).emoji} {getCategory(l.example.category).label}</p>
                    <p className="mt-1 text-lg">“{l.example.bait}”</p>
                    <p className="mt-2 text-xs text-zinc-400">💡 {l.example.note}</p>
                  </div>
                  <p className="text-sm text-rose-300">⚠️ Avoid: {l.avoid}</p>
                  <Link
                    href={`/school/play?technique=${l.id}&category=${l.example.category}`}
                    className="inline-block rounded-full bg-sky-500 px-5 py-2 text-sm font-bold text-white hover:bg-sky-400"
                  >
                    Try it →
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Free practice */}
        <section className="px-4 py-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Free practice</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/school/play?category=${c.id}`} className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">
                {c.emoji} {c.label}
              </Link>
            ))}
          </div>
          <Link href="/spot" className="mt-8 flex items-center gap-3 rounded-2xl border border-zinc-800 p-4 hover:bg-zinc-900">
            <span className="text-3xl">🕵️</span>
            <span className="flex-1"><b>Spot the Bait</b><span className="block text-sm text-zinc-400">Test yourself: 10 posts, sincere or bait?</span></span>
            <span className="text-zinc-500">›</span>
          </Link>
          <p className="mt-8 text-center text-xs text-zinc-600">Bait the topic, not the person. Slurs and attacks score zero.</p>
        </section>
      </div>
    </main>
  );
}

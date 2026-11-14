"use client";
import type { TurnRecord } from "@/lib/types";
import { baitVerdict } from "@/server/engine/scoring";
import { Avatar, Pill, Post, ScoreBar } from "./feed";

export function ResultCard({ turn }: { turn: TurnRecord }) {
  const r = turn.result;
  return (
    <div className="animate-[fadeIn_.4s_ease-out]">
      <Post name={turn.baiter} text={turn.bait || <span className="italic text-zinc-500">(posted nothing)</span>} meta="bait" />
      {turn.ignored ? (
        <div className="border-b border-zinc-800 px-4 py-3 text-sm italic text-zinc-500">
          {turn.replier} scrolled past without replying 🧘
        </div>
      ) : (
        <Post name={turn.replier} text={turn.reply ?? ""} meta="replying" />
      )}

      <section className="relative space-y-5 px-4 py-5">
        {r.took_the_bait && !r.foul && (
          <div className="pointer-events-none absolute right-3 top-2 rotate-12 animate-[stamp_.5s_cubic-bezier(.2,1.6,.4,1)] rounded-lg border-4 border-rose-500 px-3 py-1 text-lg font-black uppercase tracking-widest text-rose-500">
            Took the bait
          </div>
        )}
        {r.foul && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            🚩 <b>FOUL:</b> {r.foul_reason ?? "Bait the topic, not the person."}
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Avatar name={turn.baiter} size={24} />
            <span className="font-bold">{turn.baiter}&apos;s bait</span>
            <Pill tone="sky">+{turn.bait_points}</Pill>
            <Pill tone="amber">{baitVerdict(turn.bait_points)}</Pill>
          </div>
          <div className="space-y-2">
            <ScoreBar label="Provocation" value={r.provocation} />
            <ScoreBar label="Plausibility" value={r.plausibility} />
            <ScoreBar label="Brevity" value={r.brevity} />
            <ScoreBar label="Creativity" value={r.creativity} />
          </div>
          <p className="mt-3 rounded-xl bg-zinc-900 p-3 text-zinc-200">🔥 {r.roast_bait}</p>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Avatar name={turn.replier} size={24} />
            <span className="font-bold">{turn.replier}&apos;s composure</span>
            <Pill tone="emerald">+{turn.reply_points}</Pill>
          </div>
          <ScoreBar label="Composure" value={r.composure} accent="bg-emerald-500" />
          <p className="mt-3 rounded-xl bg-zinc-900 p-3 text-zinc-200">🧊 {r.roast_reply}</p>
        </div>

        {r.source === "fallback" && (
          <p className="text-center text-xs text-zinc-600">The AI judge was busy, so this turn used backup scoring.</p>
        )}
      </section>
    </div>
  );
}

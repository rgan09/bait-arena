"use client";
import { getCategory } from "@/lib/categories";
import type { TurnRecord } from "@/lib/types";
import { baitVerdict } from "@/server/engine/scoring";
import { Pill, Post, ScoreBar } from "./feed";

export function ResultCard({ turn }: { turn: TurnRecord }) {
  const r = turn.result;
  const cat = getCategory(turn.topic);
  const tookBait = !!r.response?.took_bait && !r.flagged_bait;
  const ratiod = !!r.response && !r.response.took_bait && r.response.ratio >= 8 && !r.flagged_response;

  return (
    <div className="relative animate-[fadeIn_.4s_ease-out]">
      <Post name={turn.baiter} text={turn.bait || <span className="italic text-zinc-500">(posted nothing)</span>} meta={`${cat.emoji} ${cat.label}`} corner="fire" />
      {turn.ignored ? (
        <p className="px-6 py-1 text-sm italic text-zinc-500">{turn.replier} scrolled past without replying 🧘</p>
      ) : (
        <Post name={turn.replier} text={turn.reply ?? ""} meta="replying" corner="ice" />
      )}
      {(tookBait || ratiod) && (
        <div className="relative z-10 -mb-2 -mt-5 flex justify-center">
          {tookBait ? <Stamp tone="fire">Took the bait 🎣</Stamp> : <Stamp tone="ice">Ratio&apos;d 💀</Stamp>}
        </div>
      )}

      <div className="mx-3 mt-4 space-y-3">
        {r.flagged_bait && <Flag>🚩 Foul: bait the topic, not the person. {turn.baiter} scores 0 this round.</Flag>}
        {r.flagged_response && <Flag>🚩 Foul: {turn.replier}&apos;s reply crossed the line, so 0 points.</Flag>}

        <section className="rounded-2xl border-2 border-fire/50 bg-fire/[0.07] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-bold">🔥 {turn.baiter}&apos;s take</span>
            <span className="ml-auto font-display text-2xl text-spot">+{turn.bait_points}</span>
          </div>
          <div className="space-y-2">
            <ScoreBar label="Provocation" value={r.bait.provocation} accent="bg-fire" />
            <ScoreBar label="Plausibility" value={r.bait.plausibility} accent="bg-fire" />
            <ScoreBar label="Creativity" value={r.bait.creativity} accent="bg-fire" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!r.flagged_bait && <Pill tone="amber">{baitVerdict(turn.bait_points)}</Pill>}
            {tookBait && <Pill tone="rose">+10: {turn.replier} took the bait</Pill>}
          </div>
          <p className="mt-3 text-lg font-semibold leading-snug text-bone">“{r.roast}”</p>
        </section>

        <section className="rounded-2xl border-2 border-ice/50 bg-ice/[0.07] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-bold">🧊 {turn.replier}&apos;s defence</span>
            {turn.ignored && <Pill>Ignored: a safe 14</Pill>}
            <span className="ml-auto font-display text-2xl text-spot">+{turn.reply_points}</span>
          </div>
          <div className="space-y-2">
            <ScoreBar label="Composure" value={r.response?.composure ?? 7} accent="bg-ice" />
            {r.response && <ScoreBar label="Ratio" value={r.response.ratio} accent="bg-violet-400" />}
          </div>
          {r.roast_response && <p className="mt-3 text-lg font-semibold leading-snug text-bone">“{r.roast_response}”</p>}
        </section>

        {r.source === "fallback" && (
          <p className="text-center text-xs text-zinc-500">The AI judge was busy, so this round used backup scoring.</p>
        )}
      </div>
    </div>
  );
}

function Stamp({ children, tone }: { children: React.ReactNode; tone: "fire" | "ice" }) {
  const c = tone === "fire" ? "border-fire text-fire" : "border-ice text-ice";
  return (
    <div
      role="status"
      className={`pointer-events-none -rotate-[6deg] animate-[stamp_.5s_cubic-bezier(.2,1.6,.4,1)] whitespace-nowrap rounded-xl border-[5px] bg-night px-4 py-1.5 font-display text-2xl shadow-[0_8px_30px_rgb(0_0_0/0.5)] ${c}`}
    >
      {children}
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border-2 border-fire/50 bg-fire/10 p-3 text-sm font-semibold text-rose-200">{children}</div>;
}

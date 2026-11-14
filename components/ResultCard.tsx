"use client";
import { getCategory } from "@/lib/categories";
import type { TurnRecord } from "@/lib/types";
import { baitVerdict } from "@/server/engine/scoring";
import { Avatar, Pill, Post, ScoreBar } from "./feed";

export function ResultCard({ turn }: { turn: TurnRecord }) {
  const r = turn.result;
  const cat = getCategory(turn.topic);
  const tookBait = !!r.response?.took_bait && !r.flagged_bait;
  const ratiod = !!r.response && !r.response.took_bait && r.response.ratio >= 8 && !r.flagged_response;

  return (
    <div className="animate-[fadeIn_.4s_ease-out]">
      <Post name={turn.baiter} text={turn.bait || <span className="italic text-zinc-500">(posted nothing)</span>} meta={`${cat.emoji} ${cat.label}`} />
      {turn.ignored ? (
        <div className="border-b border-zinc-800 px-4 py-3 text-sm italic text-zinc-500">{turn.replier} scrolled past without replying 🧘</div>
      ) : (
        <Post name={turn.replier} text={turn.reply ?? ""} meta="replying" />
      )}

      <section className="relative space-y-6 px-4 py-5">
        {tookBait && <Stamp tone="rose">Took the bait 🎣</Stamp>}
        {ratiod && <Stamp tone="emerald">Ratio&apos;d 💀</Stamp>}

        {r.flagged_bait && <Flag>🚩 <b>Foul:</b> bait the topic, not the person. {turn.baiter} scores 0 this round.</Flag>}
        {r.flagged_response && <Flag>🚩 <b>Foul:</b> {turn.replier}&apos;s reply crossed the line. 0 points.</Flag>}

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Avatar name={turn.baiter} size={24} />
            <span className="font-bold">{turn.baiter}&apos;s hot take</span>
            <Pill tone="sky">+{turn.bait_points}</Pill>
            {!r.flagged_bait && <Pill tone="amber">{baitVerdict(turn.bait_points)}</Pill>}
          </div>
          <div className="space-y-2">
            <ScoreBar label="Provocation" value={r.bait.provocation} />
            <ScoreBar label="Plausibility" value={r.bait.plausibility} />
            <ScoreBar label="Creativity" value={r.bait.creativity} />
          </div>
          {tookBait && <p className="mt-2 text-xs font-semibold text-rose-300">+10 bonus: {turn.replier} took the bait</p>}
          <p className="mt-3 rounded-xl bg-zinc-900 p-3 text-zinc-200">🔥 {r.roast}</p>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Avatar name={turn.replier} size={24} />
            <span className="font-bold">{turn.replier}&apos;s response</span>
            <Pill tone="emerald">+{turn.reply_points}</Pill>
            {turn.ignored && <Pill>Ignored: safe 14</Pill>}
          </div>
          {r.response ? (
            <div className="space-y-2">
              <ScoreBar label="Composure" value={r.response.composure} accent="bg-emerald-500" />
              <ScoreBar label="Ratio" value={r.response.ratio} accent="bg-violet-500" />
            </div>
          ) : (
            <ScoreBar label="Composure" value={7} accent="bg-emerald-500" />
          )}
          {r.roast_response && <p className="mt-3 rounded-xl bg-zinc-900 p-3 text-zinc-200">🧊 {r.roast_response}</p>}
        </div>

        {r.source === "fallback" && (
          <p className="text-center text-xs text-zinc-600">The AI judge was busy, so this round used backup scoring.</p>
        )}
      </section>
    </div>
  );
}

function Stamp({ children, tone }: { children: React.ReactNode; tone: "rose" | "emerald" }) {
  const c = tone === "rose" ? "border-rose-500 text-rose-500" : "border-emerald-400 text-emerald-400";
  return (
    <div className={`pointer-events-none absolute right-3 top-2 z-10 rotate-12 animate-[stamp_.5s_cubic-bezier(.2,1.6,.4,1)] rounded-lg border-4 bg-black/70 px-3 py-1 text-lg font-black uppercase tracking-widest ${c}`}>
      {children}
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{children}</div>;
}

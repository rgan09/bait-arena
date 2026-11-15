"use client";
// Fight Night building blocks. Corners: "fire" = the baiter (red corner), "ice" = the defender (blue corner).
import type { ReactNode } from "react";

export type Corner = "fire" | "ice";

const AVATAR_BG = ["#FF4A2B", "#39C8FF", "#FFD23F", "#B57BFF", "#FF7AB8", "#4BE3A0", "#FF9F45", "#7C8CFF"];
function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_BG[Math.abs(h) % AVATAR_BG.length];
}

export function Avatar({ name, size = 40, corner }: { name: string; size?: number; corner?: Corner }) {
  const ring = corner === "fire" ? "0 0 0 3px #FF4A2B" : corner === "ice" ? "0 0 0 3px #39C8FF" : undefined;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display text-night"
      style={{ width: size, height: size, fontSize: size * 0.44, background: colorFor(name), boxShadow: ring }}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export const handleOf = (name: string) => "@" + name.toLowerCase().replace(/[^a-z0-9_.]/g, "_");

/** A post, styled as a fight card. `corner` adds the red/blue corner stripe. */
export function Post({
  name, text, meta, muted, children, big, corner,
}: { name: string; text: ReactNode; meta?: string; muted?: boolean; children?: ReactNode; big?: boolean; corner?: Corner }) {
  const stripe = corner === "fire" ? "border-l-fire" : corner === "ice" ? "border-l-ice" : "border-l-transparent";
  return (
    <article className={`mx-3 my-3 flex gap-3 rounded-2xl border-l-4 bg-canvas/80 px-4 py-4 ${stripe} ${muted ? "opacity-60" : ""}`}>
      <Avatar name={name} corner={corner} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-bold text-bone">{name}</span>
          <span className="truncate text-zinc-500">{handleOf(name)}{meta ? `, ${meta}` : ""}</span>
        </div>
        <div className={`mt-1 whitespace-pre-wrap break-words text-bone ${big ? "text-[1.6rem] font-semibold leading-tight [font-stretch:92%]" : "text-[15px]"}`}>
          {text}
        </div>
        {children}
      </div>
    </article>
  );
}

export function Countdown({
  endsAt, total, now, label = "Time left",
}: { endsAt: string | null; total: number; now: number; label?: string }) {
  if (!endsAt) return null;
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  const secs = Math.ceil(left / 1000);
  const pct = Math.min(100, (left / (total * 1000)) * 100);
  const danger = secs <= 5;
  return (
    <div className="flex items-center gap-3 px-4 pt-3" role="timer" aria-label={`${label}: ${secs} seconds`}>
      {label !== "Time left" && <span className="whitespace-nowrap text-sm font-semibold text-zinc-400">{label}</span>}
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${danger ? "bg-fire" : "bg-spot"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-14 text-right font-display text-2xl ${danger ? "animate-pulse text-fire" : "text-spot"}`}>{secs}</span>
    </div>
  );
}

/** A 10-segment meter, like a fighting-game health bar. */
export function ScoreBar({ label, value, accent = "bg-spot" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm" aria-label={`${label} ${value} out of 10`}>
      <span className="w-24 shrink-0 text-zinc-400">{label}</span>
      <div className="flex flex-1 gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 -skew-x-12 rounded-[2px] transition-colors duration-500 ${i < value ? accent : "bg-zinc-800"}`}
            style={{ transitionDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <span className="w-7 text-right font-display text-bone">{value}</span>
    </div>
  );
}

export function Pill({ children, tone = "zinc" }: { children: ReactNode; tone?: "zinc" | "sky" | "rose" | "amber" | "emerald" }) {
  const tones = {
    zinc: "bg-zinc-800 text-zinc-300",
    sky: "bg-spot/15 text-spot",
    rose: "bg-fire/15 text-rose-300",
    amber: "bg-amber-400/15 text-amber-300",
    emerald: "bg-ice/15 text-emerald-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Chunky arcade button: sits on a hard shadow and presses down when tapped. */
export function Button({
  children, onClick, disabled, variant = "primary", type = "button",
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "ghost" | "danger"; type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-spot text-night shadow-[0_4px_0_#b38a00] hover:bg-sky-300",
    ghost: "border-2 border-zinc-700 bg-canvas text-bone shadow-[0_4px_0_#130a24] hover:border-zinc-600",
    danger: "bg-fire text-night shadow-[0_4px_0_#a5260f] hover:bg-rose-400",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-5 py-2.5 font-display text-sm tracking-wide transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

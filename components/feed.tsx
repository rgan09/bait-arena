"use client";
// Building blocks styled like a social feed.
import type { ReactNode } from "react";

const COLORS = ["bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-fuchsia-500", "bg-orange-500", "bg-teal-500"];
function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className={`${colorFor(name)} flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export const handleOf = (name: string) => "@" + name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

export function Post({
  name, text, meta, muted, children, big,
}: { name: string; text: ReactNode; meta?: string; muted?: boolean; children?: ReactNode; big?: boolean }) {
  return (
    <article className={`flex gap-3 border-b border-zinc-800 px-4 py-4 ${muted ? "opacity-60" : ""}`}>
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-bold text-zinc-100">{name}</span>
          <span className="truncate text-zinc-500">{handleOf(name)}{meta ? ` · ${meta}` : ""}</span>
        </div>
        <div className={`mt-1 whitespace-pre-wrap break-words text-zinc-100 ${big ? "text-2xl leading-snug" : "text-[15px]"}`}>
          {text}
        </div>
        {children}
      </div>
    </article>
  );
}

export function Countdown({ endsAt, total, now }: { endsAt: string | null; total: number; now: number }) {
  if (!endsAt) return null;
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  const secs = Math.ceil(left / 1000);
  const pct = Math.min(100, (left / (total * 1000)) * 100);
  const danger = secs <= 10;
  return (
    <div className="px-4 pt-3">
      <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <span>Time left</span>
        <span className={danger ? "animate-pulse text-rose-400" : "text-zinc-300"}>{secs}s</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${danger ? "bg-rose-500" : "bg-sky-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreBar({ label, value, accent = "bg-sky-500" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-zinc-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${accent} transition-[width] duration-700`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className="w-6 text-right font-mono text-zinc-200">{value}</span>
    </div>
  );
}

export function Pill({ children, tone = "zinc" }: { children: ReactNode; tone?: "zinc" | "sky" | "rose" | "amber" | "emerald" }) {
  const tones = {
    zinc: "bg-zinc-800 text-zinc-300",
    sky: "bg-sky-500/15 text-sky-300",
    rose: "bg-rose-500/15 text-rose-300",
    amber: "bg-amber-500/15 text-amber-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Button({
  children, onClick, disabled, variant = "primary", type = "button",
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "ghost" | "danger"; type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-sky-500 text-white hover:bg-sky-400",
    ghost: "border border-zinc-700 text-zinc-200 hover:bg-zinc-800",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

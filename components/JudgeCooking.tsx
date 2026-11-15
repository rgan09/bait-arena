"use client";
import { useEffect, useState } from "react";

const LINES = [
  "⚖️ The judge is cooking…",
  "📖 Reading the comments…",
  "🧮 Calculating the ratio…",
  "📱 Consulting the group chat…",
  "🔥 Measuring the spice…",
  "🧊 Checking composure levels…",
];

/** Loading state for AI calls: a spinner with rotating lines. */
export function JudgeCooking({ big = false, lines = LINES }: { big?: boolean; lines?: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % lines.length), 1400);
    return () => clearInterval(id);
  }, [lines.length]);
  return (
    <div className={`flex flex-col items-center gap-3 text-zinc-400 ${big ? "py-16 text-3xl" : "py-12"}`}>
      <div className={`animate-spin rounded-full border-4 border-zinc-700 border-t-sky-500 ${big ? "h-14 w-14" : "h-10 w-10"}`} />
      <p key={i} className="animate-[fadeIn_.3s_ease-out]">{lines[i]}</p>
    </div>
  );
}

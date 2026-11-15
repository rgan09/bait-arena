// Ranked tiers (plan section 3). Shared by UI and server.
export interface Tier {
  name: string;
  min: number;
  className: string; // badge colours
}

export const TIERS: Tier[] = [
  { name: "Grass Toucher", min: -Infinity, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { name: "Lurker", min: 900, className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  { name: "Reply Guy", min: 1000, className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  { name: "Quote Tweeter", min: 1100, className: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { name: "Ratio Lord", min: 1200, className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  { name: "Chronically Online 👑", min: 1300, className: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
];

export function tierFor(elo: number): Tier {
  let t = TIERS[0];
  for (const tier of TIERS) if (elo >= tier.min) t = tier;
  return t;
}

export const STARTING_ELO = 1000;

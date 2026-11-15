// Ranked tiers (plan section 3). Shared by UI and server.
export interface Tier {
  name: string;
  min: number;
  className: string; // badge colours
}

export const TIERS: Tier[] = [
  { name: "Grass Toucher", min: -Infinity, className: "bg-green-400/15 text-green-300 border-green-400/40" },
  { name: "Lurker", min: 900, className: "bg-zinc-700/40 text-zinc-300 border-zinc-600" },
  { name: "Reply Guy", min: 1000, className: "bg-ice/15 text-emerald-300 border-ice/40" },
  { name: "Quote Tweeter", min: 1100, className: "bg-violet-400/15 text-violet-300 border-violet-400/40" },
  { name: "Ratio Lord", min: 1200, className: "bg-fire/15 text-rose-300 border-fire/40" },
  { name: "Chronically Online 👑", min: 1300, className: "bg-spot/15 text-spot border-spot/50" },
];

export function tierFor(elo: number): Tier {
  let t = TIERS[0];
  for (const tier of TIERS) if (elo >= tier.min) t = tier;
  return t;
}

export const STARTING_ELO = 1000;

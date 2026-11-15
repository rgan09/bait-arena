import { tierFor } from "@/lib/tiers";

export function TierBadge({ elo, showElo = false, size = "sm" }: { elo: number | null | undefined; showElo?: boolean; size?: "sm" | "md" }) {
  if (elo == null) return null;
  const t = tierFor(elo);
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold ${t.className} ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      {t.name}
      {showElo && <span className="font-mono opacity-70">{elo}</span>}
    </span>
  );
}

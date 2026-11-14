// Layer 1 of the AI pipeline: an instant, free, local check that runs before any AI call.
// It catches the obvious stuff so it never reaches the projector. Anything subtler is caught by
// Gemini's built-in safety filter (layer 2) and the judge's `foul` flag (layer 3).

export interface ModerationResult {
  foul: boolean;
  reason: string | null;
}

// Phrases that target a person rather than a topic. Matched as whole words, case-insensitive.
const HARASSMENT = [
  "kys",
  "kill yourself",
  "go die",
  "unalive yourself",
  "end yourself",
  "you should die",
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[$5]/g, "s")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function moderate(text: string | null | undefined): ModerationResult {
  if (!text) return { foul: false, reason: null };
  const t = ` ${normalize(text)} `;
  for (const phrase of HARASSMENT) {
    if (t.includes(` ${phrase} `)) return { foul: true, reason: "Bait the topic, not the person." };
  }
  // @mentions and "you're a …" insults aimed at a specific person are handled by the judge prompt.
  return { foul: false, reason: null };
}

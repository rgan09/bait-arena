// Bait School lessons: the 5 core ragebait techniques (plan section 3, "Lessons").
// Each card: what it is, why it works, an example, and a "Try it" that opens the challenge with the technique tagged.

export interface Lesson {
  id: string;
  emoji: string;
  title: string;
  oneLiner: string;
  why: string; // the psychology, in one or two sentences
  recipe: string[]; // how to do it, step by step
  example: { category: string; bait: string; note: string };
  avoid: string; // the common mistake
}

export const LESSONS: Lesson[] = [
  {
    id: "confidently-wrong",
    emoji: "🫡",
    title: "The confidently wrong take",
    oneLiner: "State something absurd like it's settled science.",
    why: "People can't resist correcting someone who's wrong with total confidence. The certainty is the bait, not the claim.",
    recipe: [
      "Pick a claim that's clearly wrong but harmless.",
      "Say it flatly. No 'I think', no 'lol', no question mark.",
      "Add one fake-specific detail so it sounds researched.",
    ],
    example: { category: "food", bait: "Water is the most overrated drink. I haven't had any since 2019 and I've never felt better.", note: "Flat tone + oddly specific year = everyone rushes to correct you." },
    avoid: "Winking at the audience. The moment you add 'jk', nobody bites.",
  },
  {
    id: "fake-ignorance",
    emoji: "🤔",
    title: "Fake ignorance",
    oneLiner: "Act genuinely confused about something everyone loves.",
    why: "It makes fans feel like they have to explain (and defend) the thing they love, and explaining is exactly what you want.",
    recipe: [
      "Pick something universally loved.",
      "Ask an innocent-sounding question that implies it's pointless.",
      "Stay sincere. You're 'just asking'.",
    ],
    example: { category: "la", bait: "Wait, people actually go to the beach on purpose? Like sand, but wet, and you pay for parking?", note: "Innocent question, devastating implication." },
    avoid: "Being so dumb it's obviously fake. Confused, not clueless.",
  },
  {
    id: "unpopular-opinion",
    emoji: "📢",
    title: "Engagement farming",
    oneLiner: "\"Unpopular opinion:\" followed by a very popular opinion. Or the reverse.",
    why: "The framing promises a fight. People reply to argue it's actually popular, or that you're wrong, and either way they're replying.",
    recipe: [
      "Open with a frame like 'Unpopular opinion:' or 'Nobody wants to hear this but'.",
      "Follow it with something either obviously popular or mildly cursed.",
      "End on a short, smug line.",
    ],
    example: { category: "habits", bait: "Unpopular opinion: sleeping is good. Some of y'all aren't ready for this conversation.", note: "Mismatch between the dramatic frame and the boring take makes people reply." },
    avoid: "Using it for a truly bland take with no twist. The frame only works if there's something to react to.",
  },
  {
    id: "false-binary",
    emoji: "⚖️",
    title: "The false binary",
    oneLiner: "Turn a tiny preference into a character judgement.",
    why: "Nobody likes being told their harmless choice says something about them, so both sides show up to argue.",
    recipe: [
      "Pick a trivial either/or (milk first, cereal first).",
      "Tie one side to a big character flaw.",
      "Say it like it's obvious.",
    ],
    example: { category: "food", bait: "If you put milk in before cereal, you also reply-all to company emails.", note: "Tiny choice → huge judgement = everyone has to pick a side." },
    avoid: "Making the judgement about a real group of people. Keep it about the choice, not who people are.",
  },
  {
    id: "rhetorical-question",
    emoji: "❓",
    title: "The rhetorical question",
    oneLiner: "Ask a question where the 'obvious' answer is wrong.",
    why: "Questions demand answers. A loaded question gets people to reply with the 'right' answer, and then argue with each other.",
    recipe: [
      "Pick a thing people do all the time.",
      "Ask why anyone would do it, as if the answer is obviously 'nobody should'.",
      "Keep it under one line.",
    ],
    example: { category: "texting", bait: "Why would you call someone when you could just not?", note: "Simple, sincere-sounding, and everyone has an opinion on phone calls." },
    avoid: "Asking a genuine question. It has to imply a stance.",
  },
];

export function getLesson(id: string | null | undefined): Lesson | null {
  return LESSONS.find((l) => l.id === id) ?? null;
}

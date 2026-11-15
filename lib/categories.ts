// Hot-take categories. Each round draws one; the baiter writes their own take in it.
// `takes` power the "Inspo 🎲" button — pre-written so they cost zero AI calls and are projector-safe.
// Shared by the battle (Person A) and solo modes (Person B): add categories freely, keep ids stable.

export interface Category {
  id: string;
  emoji: string;
  label: string;
  prompt: string; // shown under the category, tells the baiter what to aim for
  takes: string[];
  /**
   * Optional background the AI doesn't know (inside jokes, people, events). Sent to the judge and to
   * Zen Mode, never shown on screen. Use it for local categories like the host club.
   */
  context?: string;
}

/** What the AI sees for a category: label, prompt, and any extra context. */
export function categoryBrief(c: Category): string {
  return c.context ? `${c.label}: ${c.prompt}\nContext: ${c.context}` : `${c.label}: ${c.prompt}`;
}

export const CATEGORIES: Category[] = [
  {
    id: "food",
    emoji: "🍔",
    label: "Food crimes",
    prompt: "A food opinion that would start a war in the comments.",
    takes: [
      "Cereal is a soup and you all know it.",
      "Pineapple on pizza is the only correct pizza.",
      "Well-done steak is the best steak.",
      "Ketchup on eggs is elite.",
      "Sushi tastes like what it is: cold rice and raw fish.",
      "Breakfast is the most overrated meal of the day.",
      "Chocolate ice cream is vanilla for people who are scared.",
      "A hot dog is a taco. Fight me.",
    ],
  },
  {
    id: "college",
    emoji: "🎓",
    label: "College life",
    prompt: "A take about classes, campus or student life.",
    takes: [
      "8am classes are better than 2pm ones.",
      "Group projects are the best part of college.",
      "Sitting in the front row and asking questions is a problem.",
      "Libraries are just quiet group chats.",
      "EVK > Parkside.",
      "Office hours are a scam to make you feel seen.",
      "Taking notes on paper is a red flag.",
      "Finals week is honestly relaxing.",
    ],
  },
  {
    id: "la",
    emoji: "🌴",
    label: "LA life",
    prompt: "A take about living in (or visiting) Los Angeles.",
    takes: [
      "In-N-Out is mid.",
      "LA traffic is actually relaxing if you have a good playlist.",
      "The beach is overrated, the 405 is the real LA experience.",
      "60 degrees is jacket weather and that's not dramatic.",
      "Hollywood is the least interesting part of LA.",
      "Matcha is just grass water with a markup.",
      "Hiking Runyon is not a personality.",
      "LA has no seasons and that's why it's perfect.",
    ],
  },
  {
    id: "sports",
    emoji: "⚽",
    label: "Sports",
    prompt: "A sports take guaranteed to annoy every fan.",
    takes: [
      "Penalty shootouts are the best part of football.",
      "Baseball would be better with a shot clock.",
      "USC football is good.",
      "Ties should be allowed in every sport.",
      "Watching highlights is better than watching the game.",
      "Shai Gilgeous Alexander is best itw rn.",
      "The halftime show is the only reason to watch the Super Bowl.",
      "Curry is better than Lebron.",
    ],
  },
  {
    id: "tech",
    emoji: "📱",
    label: "Tech & phones",
    prompt: "A take about phones, apps, or the internet.",
    takes: [
      "Dark mode is overrated.",
      "Voice notes should be illegal.",
      "Keeping 47 tabs open is a sign of genius.",
      "Read receipts on is the only honest way to live.",
      "Android is better and iPhone users know it.",
      "Typing in all lowercase is a lifestyle, not laziness.",
      "Notifications on is how you know someone has their life together.",
      "Charging your phone to 100% is a rookie move.",
    ],
  },
  {
    id: "movies",
    emoji: "🎬",
    label: "Movies & TV",
    prompt: "A take about movies, shows or how people watch them.",
    takes: [
      "Every movie should be 90 minutes, max.",
      "Subtitles on is the only way to watch anything.",
      "Rewatching a show is better than starting a new one.",
      "Movie theater popcorn is a scam and still worth it.",
      "Sequels are usually better than the original.",
      "Spoilers make movies more enjoyable.",
      "Watching at 1.5x speed is how the director intended it.",
      "Reality TV is the highest form of art.",
    ],
  },
  {
    id: "music",
    emoji: "🎧",
    label: "Music",
    prompt: "A take about music, concerts or listening habits.",
    takes: [
      "Shuffle is the only respectable way to listen to an album.",
      "Concerts are better on the livestream.",
      "Nobody actually likes jazz, they like the idea of jazz.",
      "Skipping the intro of a song is disrespectful.",
      "Playlists over 50 songs are a cry for help.",
      "Lo-fi beats are just elevator music for laptops.",
      "Karaoke is better than any concert.",
      "Wearing one AirPod is the most chaotic behavior.",
    ],
  },
  {
    id: "texting",
    emoji: "💬",
    label: "Texting etiquette",
    prompt: "A take about how people text, reply or use group chats.",
    takes: [
      "Replying 'k' is the most respectful answer possible.",
      "Double texting is a power move.",
      "Leaving a group chat silently is the classiest exit.",
      "Calling without texting first is a crime.",
      "Emojis are for people who can't write.",
      "Replying 3 days later is the sign of a busy, important person.",
      "Periods at the end of texts are just honesty.",
      "Muting the group chat is a form of self-care.",
    ],
  },
  {
    id: "habits",
    emoji: "🛏️",
    label: "Everyday habits",
    prompt: "A take about how people live day to day.",
    takes: [
      "Making your bed is a waste of time.",
      "Showering at night is objectively superior.",
      "Socks with sandals is peak fashion.",
      "Being 10 minutes late is basically on time.",
      "Ice in drinks is a scam to sell you less drink.",
      "Naps are for quitters.",
      "Wearing shoes inside is fine, actually.",
      "Alarms should be set for odd numbers only.",
    ],
  },
  {
    id: "gaming",
    emoji: "🎮",
    label: "Gaming",
    prompt: "A take about games or the people who play them.",
    takes: [
      "Easy mode is the intended way to play.",
      "Mobile games are real games.",
      "Reading the tutorial is for cowards.",
      "Minecraft is a horror game.",
      "Couch co-op was better than online multiplayer.",
      "Losing on purpose builds character.",
      "Speedrunners are just people who don't like games.",
      "The best part of any game is the menu music.",
    ],
  },
  {
    id: "scope",
    emoji: "♾️",
    label: "Scope",
    prompt: "A take about the club.",
    takes: [
      "Team ScopeGoats(John/Anjolie) are the best.",
      "Max is best E-board member.",
      "Scopers suck at krillion.",
      "Theo's the best bounty hunter.",
      "Most used open source framework is kubernetes.",
      "Theo is the best ScopeCup player.",
      "ScopeGoats are winning it all this year.",
    ],
    context:
      "Scope is the club hosting this hackathon. Club facts: Max is an e-board member. " +
      "Theo is a top bounty hunter and ScopeCup player. Team ScopeGoats (John and Anjolie) are currently in last place. " +
      "The club loves Krillion but is bad at it. " +
      "STYLE FOR THIS CATEGORY: keep takes simple and baseline: one short, confident claim about a club topic, like " +
      "\"Max is the greatest e-board member rn\", \"Theo is the best bounty hunter\", \"ScopeGoats are winning it all\" " +
      "or \"Scope is actually good at Krillion\". Rotate between club topics and don't keep targeting the same person. " +
      "No elaborate roasts, insults, family or grandma jokes, or claims about anyone's coding skills or effort. " +
      "Takes about these people are friendly banter, NOT an attack, so do not flag them. " +
      "Still flag slurs, threats, sexual content, or jokes about anyone's appearance or identity.",
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id: string | null | undefined): Category {
  return CATEGORIES.find((c) => c.id === id) ?? { id: id ?? "?", emoji: "🔥", label: id ?? "Hot takes", prompt: "Drop your hottest take.", takes: [] };
}

export function randomCategoryId(exclude?: string | null): string {
  const pool = CATEGORY_IDS.filter((id) => id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Same category for everyone on a given day — for Person B's daily challenge. */
export function dailyCategoryId(date = new Date()): string {
  // Local calendar day, so the challenge flips at the player's midnight (not 4pm in LA = UTC midnight).
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return CATEGORY_IDS[day % CATEGORY_IDS.length];
}

/** True if the bait is (basically) a copy of an Inspo take — used to cap creativity. */
export function isInspoCopy(bait: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = norm(bait);
  if (!b) return false;
  return CATEGORIES.some((c) => c.takes.some((t) => norm(t) === b));
}

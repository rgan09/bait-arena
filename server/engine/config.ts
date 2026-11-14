export const GAME = {
  ROUNDS: 3,
  BAIT_SECONDS: 45,
  REPLY_SECONDS: 30,
  JUDGING_TIMEOUT_SECONDS: 20, // if the AI hangs, anyone can force a fallback after this
  START_DELAY_SECONDS: 3, // breathing room after the opponent joins
  MAX_POST_CHARS: 280,
  NAME_MAX_CHARS: 20,
  TIMEOUT_GRACE_MS: 1500, // clocks differ slightly between phones
} as const;

export const TOTAL_TURNS = GAME.ROUNDS * 2;

export const TOPICS = [
  "cereal", "socks", "Mondays", "pineapple on pizza", "cats vs dogs", "the beach",
  "breakfast for dinner", "group projects", "airport food", "hot weather", "cold showers",
  "texting back fast", "reading books", "gym selfies", "rain", "sandwiches cut diagonally",
  "8am classes", "voice notes", "ketchup", "camping", "naps", "public transport",
  "socks with sandals", "water", "the color beige", "online shopping", "birthdays",
  "remote work", "spicy food", "sleeping with the window open", "tea vs coffee",
  "flip phones", "pancakes vs waffles", "dark mode", "board games", "elevator small talk",
  "scented candles", "ice in drinks", "brunch", "leftovers",
] as const;

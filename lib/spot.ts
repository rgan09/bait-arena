// Spot the Bait: quick-fire "sincere or bait?" cards. Hand-written, zero AI calls.
// Bait cards name the technique (lib/lessons.ts ids) so the game teaches as you play.

export interface SpotCard {
  id: string;
  text: string;
  isBait: boolean;
  why: string; // shown after answering
  technique?: string; // lesson id, for bait cards
}

const BAIT: Omit<SpotCard, "isBait" | "id">[] = [
  { text: "Water is overrated. I haven't had any since 2019 and my skin has never been better.", technique: "confidently-wrong", why: "Absurd claim stated as fact, plus a fake-specific year." },
  { text: "Wait, people actually enjoy concerts? You pay $200 to stand in a crowd and hear a worse version of the song?", technique: "fake-ignorance", why: "Pretends not to get something everyone loves." },
  { text: "Unpopular opinion: sleeping is good. Some of y'all aren't ready for this conversation.", technique: "unpopular-opinion", why: "A dramatic 'unpopular opinion' frame on a boring take, made for replies." },
  { text: "If you put milk in before cereal, you also reply-all to company emails.", technique: "false-binary", why: "Turns a tiny choice into a character judgement." },
  { text: "Why would you call someone when you could just not?", technique: "rhetorical-question", why: "A loaded question with an implied stance." },
  { text: "Pineapple on pizza is the only correct pizza. Everything else is bread with a lie on top.", technique: "confidently-wrong", why: "Extreme certainty about a famous food war." },
  { text: "Hot take: the beach is just a big sandbox for adults who gave up.", technique: "unpopular-opinion", why: "Labelled 'hot take' and phrased to insult everyone who likes beaches." },
  { text: "Genuinely asking: what's the point of reading a book when the movie exists?", technique: "fake-ignorance", why: "'Genuinely asking' is the classic fake-ignorance opener." },
  { text: "People who make their bed every morning are the same people who clap when the plane lands.", technique: "false-binary", why: "Links a harmless habit to an unrelated 'cringe' one." },
  { text: "Name one good thing about Mondays. You can't.", technique: "rhetorical-question", why: "A challenge built so people rush to prove you wrong." },
  { text: "Dark mode was invented by people who are scared of their own screens.", technique: "confidently-wrong", why: "Made-up origin story, stated flatly." },
  { text: "Nobody actually likes jazz. They like the idea of being someone who likes jazz.", technique: "confidently-wrong", why: "Sweeping claim about what everyone 'really' thinks." },
  { text: "Is it just me or are dogs kind of overrated?", technique: "rhetorical-question", why: "'Is it just me' invites a pile-on of disagreement." },
  { text: "Real ones shower at night. Morning showerers have something to hide.", technique: "false-binary", why: "Two camps, one of them accused of something absurd." },
  { text: "8am classes are better than 2pm classes and I will not be elaborating.", technique: "unpopular-opinion", why: "Contrarian take + refusing to explain = maximum replies." },
  { text: "Wait, you guys don't eat cereal with orange juice?", technique: "fake-ignorance", why: "Casually presents something cursed as normal." },
  { text: "Golf isn't a sport. It's a walk with homework.", technique: "confidently-wrong", why: "Punchy, dismissive and certain: built to be quote-tweeted." },
  { text: "If your playlist has more than 50 songs, you don't have taste, you have a hard drive.", technique: "false-binary", why: "Turns a harmless habit into a verdict on someone's taste." },
  { text: "Why do people still say 'have a good weekend' on a Thursday? Are you leaving?", technique: "rhetorical-question", why: "A tiny annoyance framed as a question to start a thread." },
  { text: "LA traffic is actually relaxing. If it stresses you out that's a you problem.", technique: "confidently-wrong", why: "Opposite of the obvious, plus a jab at anyone who disagrees." },
];

const SINCERE: Omit<SpotCard, "isBait" | "id">[] = [
  { text: "Finally tried the ramen place near campus. The broth was really good, a bit pricey though.", why: "Balanced, specific, no attempt to provoke." },
  { text: "Does anyone have tips for waking up for 8am classes? I keep sleeping through my alarm.", why: "A real question looking for real help." },
  { text: "I know pineapple on pizza is divisive but I genuinely like it. No hate to anyone who doesn't.", why: "Shares an opinion and defuses the fight instead of starting one." },
  { text: "Reminder that the library is open 24 hours during finals week. Good luck everyone!", why: "Helpful info, nothing to argue with." },
  { text: "Not sure how I feel about the new dark mode update. Anyone else find it harder to read?", why: "Uncertain and open, not a loaded claim." },
  { text: "My dog learned to open the fridge today and I don't know whether to be proud or worried.", why: "A wholesome story, not an argument." },
  { text: "Watched the game last night. Tough loss, but the second half was a big improvement.", why: "Measured take with nuance." },
  { text: "Does anyone know if the farmers market is still on this Sunday with the rain?", why: "Just a question with no stance in it." },
  { text: "I've started showering at night and I'm sleeping a lot better. Might just be me though.", why: "Personal experience with a hedge, not a judgement of others." },
  { text: "Hot chocolate season is officially here and I'm very happy about it.", why: "Uncontroversial enthusiasm." },
  { text: "I don't really get jazz yet, but I'm trying. Any albums you'd recommend for a beginner?", why: "Admits not getting something and asks to learn: the opposite of fake ignorance." },
  { text: "Group project went surprisingly well this time. Shoutout to my team for actually replying.", why: "Positive and specific." },
  { text: "Traffic on the 405 was rough today. Leaving 20 minutes earlier tomorrow.", why: "Venting with no target." },
  { text: "Small thing, but I really appreciate people who hold the elevator.", why: "Gratitude, nothing to fight about." },
  { text: "I prefer tea over coffee, but honestly whatever gets you through the morning.", why: "States a preference and explicitly respects the other side." },
  { text: "Trying to cut down on screen time. Anyone used an app blocker that actually works?", why: "A sincere ask for advice." },
  { text: "The sunset from the parking structure tonight was unreal.", why: "Just sharing a nice moment." },
  { text: "I liked the movie but it could've been 30 minutes shorter. Still worth watching.", why: "Mild critique balanced with praise." },
  { text: "Anyone else's Wi-Fi down in the dorms right now?", why: "A practical question." },
  { text: "Made my bed every day this week for the first time ever. Small wins.", why: "Personal win, no comparison to anyone." },
];

export const SPOT_CARDS: SpotCard[] = [
  ...BAIT.map((c, i) => ({ ...c, id: `b${i}`, isBait: true })),
  ...SINCERE.map((c, i) => ({ ...c, id: `s${i}`, isBait: false })),
];

export const SPOT = { ROUND_SIZE: 10, SECONDS_PER_CARD: 7 } as const;

/** A shuffled round with a roughly even mix of bait and sincere posts. */
export function dealRound(size: number = SPOT.ROUND_SIZE, rand = Math.random): SpotCard[] {
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [rand(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const baits = shuffle(SPOT_CARDS.filter((c) => c.isBait));
  const sincere = shuffle(SPOT_CARDS.filter((c) => !c.isBait));
  const nBait = Math.round(size / 2 + (rand() - 0.5) * 2); // 4–6 bait in a 10-card round, so you can't just alternate
  return shuffle([...baits.slice(0, nBait), ...sincere.slice(0, size - nBait)]);
}

/** End-of-round title (plan: "Unbothered", "Moisturized", "Touched Grass"). */
export function spotTitle(correct: number, total: number): { title: string; blurb: string } {
  const pct = total ? correct / total : 0;
  if (pct === 1) return { title: "Touched Grass 🌱", blurb: "Perfect. Nothing gets past you." };
  if (pct >= 0.8) return { title: "Moisturized 🧴", blurb: "Bait bounces right off you." };
  if (pct >= 0.6) return { title: "Unbothered 😌", blurb: "Solid instincts, a couple slipped through." };
  if (pct >= 0.4) return { title: "Mildly Cooked 🍳", blurb: "The bait is getting to you. Review the lessons." };
  return { title: "Fully Baited 🎣", blurb: "You'd reply to all of these. Head to Bait School." };
}

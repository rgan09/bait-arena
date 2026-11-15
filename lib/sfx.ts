"use client";
// Tiny synthesized sound effects (Web Audio): no audio files to load, nothing to license.
// Browsers only allow sound after a click/tap, so unlockAudio() runs on the first interaction.

let ctx: AudioContext | null = null;
const MUTE_KEY = "bait:muted";

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function audioUnlocked() {
  return !!ctx && ctx.state === "running";
}

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setMuted(m: boolean) {
  try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch {}
}

function tone(freq: number, at: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number } = {}) {
  const c = ac();
  if (!c || isMuted() || c.state !== "running") return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(at: number, dur: number, gain = 0.25) {
  const c = ac();
  if (!c || isMuted() || c.state !== "running") return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  src.buffer = buf;
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  /** a post goes up */
  pop: () => tone(520, 0, 0.12, { type: "triangle", to: 880, gain: 0.15 }),
  /** scores revealed */
  ding: () => { tone(988, 0, 0.35, { gain: 0.18 }); tone(1319, 0.08, 0.45, { gain: 0.14 }); },
  /** TOOK THE BAIT — the "vine boom" */
  boom: () => { tone(110, 0, 0.9, { gain: 0.55, to: 38 }); noise(0, 0.35, 0.35); },
  /** RATIO'D — a little airhorn */
  ratio: () => [0, 0.18, 0.36].forEach((at) => { tone(466, at, 0.14, { type: "sawtooth", gain: 0.08 }); tone(587, at, 0.14, { type: "sawtooth", gain: 0.06 }); }),
  /** match over */
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, { type: "triangle", gain: 0.16 })),
  /** last seconds on the clock */
  tick: () => tone(1500, 0, 0.04, { type: "square", gain: 0.04 }),
};

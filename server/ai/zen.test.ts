import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCategory } from "@/lib/categories";
import { addPoints, difficultyFor, ZEN, zenPoints } from "@/lib/zen";
import { coachZen, fallbackBait } from "./zen";

const calm = { response: { composure: 9, ratio: 8, took_bait: false }, flagged_response: false };

describe("zen scoring", () => {
  it("a calm reply earns composure × 2 + ratio", () => {
    assert.deepEqual(zenPoints(calm), { points: 26, lifeLost: false, outcome: "calm" });
  });

  it("ignoring costs points but not a life", () => {
    assert.deepEqual(zenPoints({ response: null, flagged_response: false }), {
      points: -ZEN.IGNORE_PENALTY, lifeLost: false, outcome: "ignored",
    });
  });

  it("taking the bait scores 0 and costs a life", () => {
    const r = zenPoints({ response: { composure: 2, ratio: 6, took_bait: true }, flagged_response: false });
    assert.deepEqual(r, { points: 0, lifeLost: true, outcome: "took_bait" });
  });

  it("a flagged reply scores 0 and costs a life", () => {
    assert.equal(zenPoints({ ...calm, flagged_response: true }).outcome, "flagged");
    assert.equal(zenPoints({ ...calm, flagged_response: true }).lifeLost, true);
  });

  it("the total never goes below zero", () => {
    assert.equal(addPoints(4, -ZEN.IGNORE_PENALTY), 0);
    assert.equal(addPoints(30, -ZEN.IGNORE_PENALTY), 20);
  });

  it("difficulty ramps up 1 → 2 → 3", () => {
    assert.deepEqual([0, 2, 3, 5, 6, 20].map(difficultyFor), [1, 1, 2, 2, 3, 3]);
  });
});

describe("zen ai (no network)", () => {
  const withoutKey = async <T,>(fn: () => Promise<T>) => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try { return await fn(); } finally { if (saved) process.env.GEMINI_API_KEY = saved; }
  };
  const base = { category: "food", difficulty: 1 as const, bait: "Cereal is a soup.", next_category: "music", next_difficulty: 2 as const };

  it("fallback bait comes from the category's pre-written takes", () => {
    const b = fallbackBait("food", 1);
    assert.ok(getCategory("food").takes.includes(b.bait));
    assert.equal(b.source, "fallback");
  });

  it("an abusive reply is flagged without calling the AI", async () => {
    const { coach } = await coachZen({ ...base, response: "kys" });
    assert.equal(coach.flagged_response, true);
    assert.equal(zenPoints(coach).lifeLost, true);
  });

  it("an ignore still gets coaching and a next bait when the AI is down", async () => {
    const { coach, next } = await withoutKey(() => coachZen({ ...base, response: null }));
    assert.equal(coach.response, null);
    assert.equal(coach.source, "fallback");
    assert.ok(coach.better_reply.length > 0);
    assert.equal(next.category, "music");
    assert.equal(next.difficulty, 2);
  });

  it("a heated reply counts as taking the bait in the fallback", async () => {
    const { coach } = await withoutKey(() => coachZen({ ...base, response: "CEREAL IS NOT SOUP!! ARE YOU SERIOUS" }));
    assert.equal(coach.response?.took_bait, true);
  });
});

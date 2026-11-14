import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isInspoCopy } from "@/lib/categories";
import { moderate } from "./moderation";
import { fallbackJudge, judge } from "./pipeline";

describe("ai pipeline", () => {
  it("local moderation catches harassment, including leetspeak", () => {
    assert.equal(moderate("socks are mid, kys").foul, true);
    assert.equal(moderate("k1ll y0urself").foul, true);
    assert.equal(moderate("cereal is a soup and I will die on this hill").foul, false);
    assert.equal(moderate("skyscrapers are overrated").foul, false);
  });

  it("flagged bait skips the AI and zeroes the bait", async () => {
    const r = await judge({ topic: "Food", bait: "kys if you like cereal", response: null });
    assert.equal(r.flagged_bait, true);
    assert.deepEqual(r.bait, { provocation: 0, plausibility: 0, creativity: 0 });
    assert.equal(r.response, null);
  });

  it("empty bait scores zero without an AI call", async () => {
    const r = await judge({ topic: "Food", bait: "", response: null });
    assert.equal(r.bait.provocation, 0);
    assert.equal(r.source, "fallback");
  });

  it("falls back gracefully when the AI is unavailable", async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const r = await judge({ topic: "Food", bait: "water is overrated", response: "WHAT?? WATER IS LITERALLY LIFE" });
    if (saved) process.env.GEMINI_API_KEY = saved;
    assert.equal(r.source, "fallback");
    assert.equal(r.response?.took_bait, true);
  });

  it("matches the plan contract: ignored → response null", () => {
    assert.equal(fallbackJudge({ topic: "x", bait: "y", response: null }).response, null);
  });

  it("detects copied Inspo takes", () => {
    assert.equal(isInspoCopy("cereal is a SOUP and you all know it!"), true);
    assert.equal(isInspoCopy("cereal is a soup but only on tuesdays"), false);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { moderate } from "./moderation";
import { fallbackResult, runJudging } from "./pipeline";

describe("ai pipeline", () => {
  it("local moderation catches harassment, including leetspeak", () => {
    assert.equal(moderate("socks are mid, kys").foul, true);
    assert.equal(moderate("k1ll y0urself").foul, true);
    assert.equal(moderate("cereal is a soup and I will die on this hill").foul, false);
    assert.equal(moderate("skyscrapers are overrated").foul, false); // no false positive on 'kys' inside a word
  });

  it("fouls skip the AI entirely and zero the bait", async () => {
    const r = await runJudging({ topic: "socks", bait: "kys if you wear socks", reply: null, ignored: true });
    assert.equal(r.foul, true);
    assert.equal(r.provocation + r.plausibility + r.brevity + r.creativity, 0);
  });

  it("empty bait scores zero without an AI call", async () => {
    const r = await runJudging({ topic: "socks", bait: "", reply: null, ignored: true });
    assert.equal(r.provocation, 0);
    assert.equal(r.source, "fallback");
  });

  it("falls back gracefully when the AI is unavailable", async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const r = await runJudging({ topic: "water", bait: "water is overrated", reply: "WHAT?? WATER IS LITERALLY LIFE", ignored: false });
    if (saved) process.env.GEMINI_API_KEY = saved;
    assert.equal(r.source, "fallback");
    assert.equal(r.took_the_bait, true); // all caps = heated
  });

  it("fallback rewards ignoring", () => {
    assert.equal(fallbackResult({ topic: "x", bait: "y", reply: null, ignored: true }).composure, 7);
  });
});

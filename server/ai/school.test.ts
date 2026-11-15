import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LESSONS } from "@/lib/lessons";
import { CATEGORY_IDS } from "@/lib/categories";
import { fallbackReplies, judgeBaitWithReplies, withLikes } from "./school";

describe("bait school", () => {
  it("comment section grows with the score", () => {
    assert.equal(fallbackReplies(5).length, 2);
    assert.ok(fallbackReplies(15).length >= 4);
    assert.ok(fallbackReplies(28).length >= 7);
  });

  it("better bait gets more likes", () => {
    const r = [{ username: "a", text: "x" }];
    const avg = (s: number) => Array.from({ length: 50 }, () => withLikes(r, s)[0].likes).reduce((a, b) => a + b) / 50;
    assert.ok(avg(28) > avg(5) * 10);
  });

  it("flagged bait gets zero and no comment section, without an AI call", async () => {
    const r = await judgeBaitWithReplies({ category: "food", bait: "kys if you like cereal", technique: null });
    assert.equal(r.flagged, true);
    assert.equal(r.replies.length, 0);
    assert.equal(r.provocation + r.plausibility + r.creativity, 0);
  });

  it("falls back gracefully without the AI", async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const r = await judgeBaitWithReplies({ category: "food", bait: "cereal is a soup", technique: "confidently-wrong" });
    if (saved) process.env.GEMINI_API_KEY = saved;
    assert.equal(r.source, "fallback");
    assert.equal(r.technique_hit, null);
    assert.ok(r.replies.length >= 2);
  });

  it("every lesson example uses a real category", () => {
    for (const l of LESSONS) assert.ok(CATEGORY_IDS.includes(l.example.category), l.id);
  });
});

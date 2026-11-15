import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getLesson } from "@/lib/lessons";
import { dealRound, SPOT_CARDS, spotTitle } from "@/lib/spot";

describe("spot the bait", () => {
  it("deals 10 unique cards with 4–6 bait", () => {
    for (let k = 0; k < 50; k++) {
      const r = dealRound(10);
      assert.equal(r.length, 10);
      assert.equal(new Set(r.map((c) => c.id)).size, 10);
      const baits = r.filter((c) => c.isBait).length;
      assert.ok(baits >= 4 && baits <= 6, `got ${baits}`);
    }
  });
  it("every bait card points at a real lesson", () => {
    for (const c of SPOT_CARDS.filter((c) => c.isBait)) assert.ok(getLesson(c.technique), c.id);
  });
  it("titles go from Fully Baited to Touched Grass", () => {
    assert.match(spotTitle(10, 10).title, /Touched Grass/);
    assert.match(spotTitle(2, 10).title, /Fully Baited/);
  });
});

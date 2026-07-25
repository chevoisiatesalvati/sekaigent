import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampSkills, skillSum } from "./stores/squadStore";
import { SKILL_POINT_BUDGET, SKILL_KEYS } from "./types";
import type { SkillKey } from "@/lib/copy";

describe("skill budget helpers", () => {
  it("sums seven tradecraft skills", () => {
    const skills = Object.fromEntries(
      SKILL_KEYS.map((k) => [k, 50]),
    ) as Record<SkillKey, number>;
    assert.equal(skillSum(skills), 350);
  });

  it("clamps skills into 0-100 and under budget", () => {
    const skills = Object.fromEntries(
      SKILL_KEYS.map((k) => [k, 90]),
    ) as Record<SkillKey, number>;
    const clamped = clampSkills(skills);
    assert.ok(skillSum(clamped) <= SKILL_POINT_BUDGET);
    for (const key of SKILL_KEYS) {
      assert.ok(clamped[key] >= 0 && clamped[key] <= 100);
    }
  });
});

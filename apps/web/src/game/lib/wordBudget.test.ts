import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countMissionOrdersWords,
  countWords,
  isWithinWordBudget,
  missionOrdersWordMax,
  standingRulesWordMax,
} from "./wordBudget";

describe("wordBudget", () => {
  it("counts words ignoring extra whitespace", () => {
    assert.equal(countWords("  prefer silent   exits  "), 3);
    assert.equal(countWords(""), 0);
  });

  it("scales standing rules with level", () => {
    assert.equal(standingRulesWordMax(1), 15);
    assert.equal(standingRulesWordMax(3), 25);
  });

  it("scales mission orders with level from a usable base", () => {
    assert.equal(missionOrdersWordMax(1), 50);
    assert.equal(missionOrdersWordMax(2), 60);
    assert.equal(missionOrdersWordMax(3), 70);
  });

  it("starts at zero for lean scaffold and ignores step action labels", () => {
    const lean = {
      approach: "",
      steps: [
        { action: "Recon", detail: "" },
        { action: "Execute", detail: "" },
        { action: "Exfil", detail: "" },
      ],
      risksAccepted: [] as string[],
      resourcesUsed: [] as string[],
      contingencies: [] as string[],
      finalOutcomeClaim: "",
    };
    assert.equal(countMissionOrdersWords(lean), 0);
    assert.equal(
      countMissionOrdersWords({
        ...lean,
        steps: [{ action: "Recon", detail: "use the crane shadow" }],
      }),
      4,
    );
  });

  it("checks budget", () => {
    assert.equal(isWithinWordBudget("one two three", 3), true);
    assert.equal(isWithinWordBudget("one two three four", 3), false);
  });
});

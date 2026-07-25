import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCountdown, formatOgFromWei, formatWinRate } from "./format.js";

describe("formatOgFromWei", () => {
  it("formats whole 0G", () => {
    assert.equal(formatOgFromWei("1000000000000000000"), "1 0G");
  });
  it("formats fractional stake", () => {
    assert.equal(formatOgFromWei("1000000000000000"), "0.001 0G");
  });
  it("formats zero", () => {
    assert.equal(formatOgFromWei("0"), "0 0G");
  });
});

describe("formatWinRate", () => {
  it("renders percent form", () => {
    assert.equal(formatWinRate(0.75), "75% form");
  });
});

describe("formatCountdown", () => {
  it("handles closed window", () => {
    assert.equal(
      formatCountdown(new Date(Date.now() - 1000).toISOString()),
      "Window closed",
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCountdown,
  formatOgFromWei,
  formatWinRate,
  isMissionAcceptingOrders,
} from "./format.js";

describe("formatOgFromWei", () => {
  it("formats whole 0G", () => {
    assert.equal(formatOgFromWei("1000000000000000000"), "1 0G");
  });
  it("parses fractional mission tax", () => {
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
  it("handles closed deadline", () => {
    assert.equal(
      formatCountdown(new Date(Date.now() - 1000).toISOString()),
      "Window closed",
    );
  });
});

describe("isMissionAcceptingOrders", () => {
  it("rejects open status after ends_at", () => {
    assert.equal(
      isMissionAcceptingOrders({
        status: "open",
        ends_at: new Date(Date.now() - 60_000).toISOString(),
      }),
      false,
    );
  });
  it("accepts open status before ends_at", () => {
    assert.equal(
      isMissionAcceptingOrders({
        status: "open",
        ends_at: new Date(Date.now() + 60_000).toISOString(),
      }),
      true,
    );
  });
});

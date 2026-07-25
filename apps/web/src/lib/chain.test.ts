import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OG_CHAIN_ID, ogMainnet } from "./chain.js";

describe("0G mainnet chain config", () => {
  it("uses chain id 16661 only", () => {
    assert.equal(OG_CHAIN_ID, 16661);
    assert.equal(ogMainnet.id, 16661);
    assert.equal(ogMainnet.name, "0G Mainnet");
  });
});

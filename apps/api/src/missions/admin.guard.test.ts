import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mintAdminToken } from "./admin.guard.js";

describe("mintAdminToken", () => {
  it("is deterministic for address+secret", () => {
    const a = mintAdminToken("0xabc", "secret");
    const b = mintAdminToken("0xABC", "secret");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });
});

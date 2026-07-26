import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAddressEqual } from "./admin.guard.js";

describe("isAddressEqual", () => {
  it("matches checksum and lowercase forms", () => {
    assert.equal(
      isAddressEqual(
        "0x517A4221825c816dbe8685aD2eA802E5e1467Bf8",
        "0x517a4221825c816dbe8685ad2ea802e5e1467bf8",
      ),
      true,
    );
  });

  it("rejects non-address strings", () => {
    assert.equal(isAddressEqual("not-an-address", "0x517a4221825c816dbe8685ad2ea802e5e1467bf8"), false);
    assert.equal(isAddressEqual("0xabc", "0xabc"), false);
  });

  it("rejects different addresses", () => {
    assert.equal(
      isAddressEqual(
        "0x517A4221825c816dbe8685aD2eA802E5e1467Bf8",
        "0x0000000000000000000000000000000000000001",
      ),
      false,
    );
  });
});

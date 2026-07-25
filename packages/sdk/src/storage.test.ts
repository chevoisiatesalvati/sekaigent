import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemoryStorage } from "./storage.js";
import { openSealedJson, sealJson } from "./crypto.js";

describe("MemoryStorage sealed round-trip", () => {
  it("stores and retrieves sealed JSON", async () => {
    const storage = new MemoryStorage();
    const payload = {
      missionId: "m1",
      approach: "forge pass",
      steps: [{ action: "a", detail: "d" }],
    };
    const put = await storage.putSealedJson(payload, "owner-secret");
    assert.equal(put.backend, "memory");
    assert.ok(put.rootHash.startsWith("mem://"));

    const got = await storage.getSealedJson<typeof payload>(
      put.rootHash,
      "owner-secret",
    );
    assert.deepEqual(got, payload);
  });

  it("fails with wrong password", () => {
    const sealed = sealJson({ x: 1 }, "right");
    assert.throws(() => openSealedJson(sealed, "wrong"));
  });
});

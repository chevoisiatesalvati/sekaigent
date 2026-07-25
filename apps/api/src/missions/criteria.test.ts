import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execSync } from "node:child_process";
import { computeCriteriaCommitment } from "./criteria.js";

describe("computeCriteriaCommitment", () => {
  it("is stable for fixed inputs", () => {
    const a = computeCriteriaCommitment("no bribes", "salt");
    const b = computeCriteriaCommitment("no bribes", "salt");
    assert.equal(a, b);
    assert.match(a, /^0x[a-fA-F0-9]{64}$/);
  });

  it("matches Solidity abi.encodePacked keccak256", () => {
    const criteria = "no bribes; stealth only";
    const salt = "salt-v1";
    const jsHash = computeCriteriaCommitment(criteria, salt);

    // Use cast (foundry) as oracle for Solidity packing
    const castHash = execSync(
      `cast keccak "$(cast --from-utf8 "${criteria}${salt}")"`,
      { encoding: "utf8" },
    ).trim();

    // cast --from-utf8 may not exist on all versions; fallback via printf hex
    let solidityStyle: string;
    try {
      solidityStyle = castHash;
      if (!solidityStyle.startsWith("0x")) {
        throw new Error("bad cast output");
      }
    } catch {
      const hex = Buffer.from(criteria + salt, "utf8").toString("hex");
      solidityStyle = execSync(`cast keccak 0x${hex}`, {
        encoding: "utf8",
      }).trim();
    }

    assert.equal(jsHash.toLowerCase(), solidityStyle.toLowerCase());
  });
});

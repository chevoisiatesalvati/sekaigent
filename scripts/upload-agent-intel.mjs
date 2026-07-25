#!/usr/bin/env node
/**
 * Seal agent private intel and upload to 0G Storage (mainnet).
 * Requires DEPLOYER_PRIVATE_KEY (or STORAGE_PRIVATE_KEY) and funded wallet.
 */
import { OgStorageClient } from "@sekaigent/sdk";

const key = process.env.STORAGE_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
if (!key) {
  console.error("Set DEPLOYER_PRIVATE_KEY");
  process.exit(2);
}

const intel = {
  personality: "cautious, analytical",
  skills: {
    infiltration: 62,
    socialEngineering: 55,
    forgery: 78,
    surveillance: 48,
    exfiltration: 58,
    tech: 44,
    combatRestraint: 88,
  },
  behaviorRules: ["no violence", "prefer forged credentials", "abort if challenged twice"],
  memoryDigest: "first mainnet agent",
};

const password = process.env.AGENT_SEAL_PASSWORD || "sekaigent-dev-seal";
const client = new OgStorageClient();
const result = await client.putSealedJson(intel, password, key);
console.log(
  JSON.stringify(
    {
      rootHash: result.rootHash,
      txHash: result.txHash,
      backend: result.backend,
      encryptedURI: `0g://${result.rootHash}`,
    },
    null,
    2,
  ),
);

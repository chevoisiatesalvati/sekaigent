import { keccak256, stringToBytes, concat, toBytes } from "viem";

/**
 * Matches Solidity: keccak256(abi.encodePacked(criteria, salt))
 * abi.encodePacked of two strings concatenates their UTF-8 bytes.
 */
export function computeCriteriaCommitment(
  criteria: string,
  salt: string,
): `0x${string}` {
  return keccak256(concat([stringToBytes(criteria), stringToBytes(salt)]));
}

/** Alternate using TextEncoder for tests against forge computeCriteriaCommitment */
export function computeCriteriaCommitmentSolidityStyle(
  criteria: string,
  salt: string,
): `0x${string}` {
  const packed = new Uint8Array([
    ...toBytes(criteria),
    ...toBytes(salt),
  ]);
  return keccak256(packed);
}

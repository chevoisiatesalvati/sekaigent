import addresses from "../../../../deployments/mainnet/addresses.json";
import sekaiAgentArtifact from "../../../../deployments/mainnet/SekaiAgent.json";
import missionVaultArtifact from "../../../../deployments/mainnet/MissionVault.json";
import type { Abi } from "viem";

export const MAINNET_ADDRESSES = {
  sekaiAgent: addresses.contracts.SekaiAgent as `0x${string}`,
  missionVault: addresses.contracts.MissionVault as `0x${string}`,
  chainId: addresses.chainId as 16661,
};

export const sekaiAgentAbi = sekaiAgentArtifact.abi as Abi;
export const missionVaultAbi = missionVaultArtifact.abi as Abi;

/** Convert a player-facing 0G amount string (e.g. "0.001") to wei. */
export function ogAmountToWei(amountOg: string): bigint {
  const trimmed = amountOg.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a valid 0G amount.");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "000000000000000000").slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(fracPadded);
}

export function weiStringToBigInt(wei: string): bigint {
  return BigInt(wei);
}

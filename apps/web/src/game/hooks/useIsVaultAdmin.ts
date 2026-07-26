"use client";

import { useAccount, useReadContract } from "wagmi";
import { MAINNET_ADDRESSES, missionVaultAbi } from "@/lib/contracts";
import { OG_CHAIN_ID } from "@/lib/chain";

/**
 * True when the connected wallet holds MissionVault ADMIN_ROLE
 * (deployer / case author). Used to show Bureau and authorize admin API calls.
 */
export function useIsVaultAdmin() {
  const { address, chainId, isConnected } = useAccount();
  const onMainnet = isConnected && chainId === OG_CHAIN_ID;

  const { data: adminRole, isLoading: roleLoading } = useReadContract({
    address: MAINNET_ADDRESSES.missionVault,
    abi: missionVaultAbi,
    functionName: "ADMIN_ROLE",
    query: { enabled: onMainnet },
  });

  const { data: hasAdmin, isLoading: hasLoading } = useReadContract({
    address: MAINNET_ADDRESSES.missionVault,
    abi: missionVaultAbi,
    functionName: "hasRole",
    args:
      adminRole && address
        ? [adminRole as `0x${string}`, address]
        : undefined,
    query: { enabled: Boolean(onMainnet && adminRole && address) },
  });

  return {
    isAdmin: Boolean(onMainnet && hasAdmin),
    isLoading: onMainnet && (roleLoading || hasLoading),
    address: address ?? null,
  };
}

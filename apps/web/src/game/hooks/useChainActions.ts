"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { keccak256, stringToHex } from "viem";
import {
  MAINNET_ADDRESSES,
  missionVaultAbi,
  sekaiAgentAbi,
  weiStringToBigInt,
} from "@/lib/contracts";
import { OG_CHAIN_ID } from "@/lib/chain";
import { hashMissionPlayDraft } from "@/lib/playHash";
import type { MissionPlayDraft, SquadAgent } from "../types";
import type { MissionListItem } from "@/lib/api";

/**
 * Attempt on-chain mint when wallet has minter role.
 * Falls back quietly — hire still succeeds on the local desk.
 */
export function useMintAgent() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<string | null>(null);

  async function mintIfPossible(
    agent: SquadAgent,
  ): Promise<{ tokenId: string; txHash: string } | null> {
    if (!address || chainId !== OG_CHAIN_ID || !publicClient) {
      setStatus("Local desk only — switch to 0G Mainnet for chain mint.");
      return null;
    }
    try {
      setStatus("Checking minter role…");
      const minterRole = (await publicClient.readContract({
        address: MAINNET_ADDRESSES.sekaiAgent,
        abi: sekaiAgentAbi,
        functionName: "MINTER_ROLE",
      })) as `0x${string}`;
      const hasRole = (await publicClient.readContract({
        address: MAINNET_ADDRESSES.sekaiAgent,
        abi: sekaiAgentAbi,
        functionName: "hasRole",
        args: [minterRole, address],
      })) as boolean;
      if (!hasRole) {
        setStatus("No minter role — hired on local desk.");
        return null;
      }
      const metadataHash = keccak256(
        stringToHex(
          JSON.stringify({
            name: agent.name,
            codename: agent.codename,
            archetype: agent.archetype,
          }),
        ),
      );
      setStatus("Minting on 0G…");
      const txHash = await writeContractAsync({
        address: MAINNET_ADDRESSES.sekaiAgent,
        abi: sekaiAgentAbi,
        functionName: "mint",
        args: [address, `local://${agent.id}`, metadataHash],
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      const total = await publicClient.readContract({
        address: MAINNET_ADDRESSES.sekaiAgent,
        abi: sekaiAgentAbi,
        functionName: "totalSupply",
      });
      setStatus(`Minted dossier #${String(total)}`);
      return { tokenId: String(total), txHash: receipt.transactionHash };
    } catch (err) {
      setStatus(
        err instanceof Error
          ? `Mint skipped: ${err.message.slice(0, 120)}`
          : "Mint skipped — local desk.",
      );
      return null;
    }
  }

  return { mintIfPossible, status };
}

export function useSealOnChain() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<string | null>(null);

  async function sealOnChain(input: {
    mission: MissionListItem;
    agent: SquadAgent;
    draft: MissionPlayDraft;
  }): Promise<{
    playHash: `0x${string}`;
    acceptTxHash?: string;
    submitTxHash?: string;
    localOnly: boolean;
    error?: string;
  }> {
    const submittedAt = Math.floor(Date.now() / 1000);
    const playHash = hashMissionPlayDraft({
      missionId: input.mission.id,
      agentTokenId: input.agent.dossierNumber ?? "0",
      draft: input.draft,
      submittedAt,
    });

    const onChainId = input.mission.id.match(/^\d+$/)
      ? BigInt(input.mission.id)
      : null;
    const tokenId = input.agent.dossierNumber
      ? BigInt(input.agent.dossierNumber)
      : null;

    if (
      !address ||
      chainId !== OG_CHAIN_ID ||
      !publicClient ||
      onChainId == null ||
      tokenId == null
    ) {
      setStatus("Orders sealed on local desk (no on-chain mission id / token).");
      return { playHash, localOnly: true };
    }

    try {
      setStatus("Accepting case (paying mission tax)…");
      const value = weiStringToBigInt(input.mission.entry_fee_wei);
      const acceptTxHash = await writeContractAsync({
        address: MAINNET_ADDRESSES.missionVault,
        abi: missionVaultAbi,
        functionName: "acceptMission",
        args: [onChainId, tokenId],
        value,
      });
      await publicClient.waitForTransactionReceipt({ hash: acceptTxHash });

      setStatus("Submitting sealed orders…");
      const submitTxHash = await writeContractAsync({
        address: MAINNET_ADDRESSES.missionVault,
        abi: missionVaultAbi,
        functionName: "submitPlay",
        args: [onChainId, tokenId, playHash],
      });
      await publicClient.waitForTransactionReceipt({ hash: submitTxHash });
      setStatus("Orders on chain.");
      return { playHash, acceptTxHash, submitTxHash, localOnly: false };
    } catch (err) {
      const message =
        err instanceof Error ? err.message.slice(0, 160) : "Chain seal failed";
      setStatus(message);
      return { playHash, localOnly: true, error: message };
    }
  }

  return { sealOnChain, status };
}

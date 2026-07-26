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
import { waitForOgReceipt } from "@/lib/ogReceipt";
import { hashMissionPlayDraft } from "@/lib/playHash";
import {
  missionChainId,
  recordPlayStorage,
  registerAgentCard,
  sealAgentIntel,
  sealPlayToStorage,
  syncAgentPackage,
  USE_MOCKS,
  type MissionListItem,
} from "@/lib/api";
import type { MissionPlayDraft, SquadAgent } from "../types";
import { countWords, standingRulesWordMax } from "../lib/wordBudget";

/**
 * Attempt on-chain mint when wallet has minter role.
 * Seals private intel to 0G Storage (via API) before mint.
 */
export function useMintAgent() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<string | null>(null);

  async function mintIfPossible(
    agent: SquadAgent,
  ): Promise<{ tokenId: string; txHash: string; encryptedURI: string } | null> {
    if (!address || chainId !== OG_CHAIN_ID || !publicClient) {
      setStatus(
        USE_MOCKS
          ? "Local desk only — switch to 0G Mainnet for chain mint."
          : "Connect wallet on 0G Mainnet to mint.",
      );
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
        setStatus(
          USE_MOCKS
            ? "No minter role — hired on local desk."
            : "No minter role on this wallet.",
        );
        return null;
      }

      setStatus("Sealing agent package to 0G Storage…");
      // ERC-7857 / plan: NFT.encryptedURI → sealed package on 0G Storage.
      // metadataHash commits to publicCard; privateIntel is in the same blob.
      const publicCard = {
        name: agent.name,
        codename: agent.codename,
        archetype: agent.archetype,
        portraitId: agent.portraitId,
        publicSummary: agent.publicSummary,
        level: agent.level,
        xp: agent.xp,
        missionCount: agent.missionCount,
        winRate: agent.winRate,
      };
      const packagePayload = {
        version: 1 as const,
        publicCard,
        privateIntel: {
          personality: agent.personality,
          skills: agent.skills,
          behaviorRules: agent.behaviorRules,
          memoryDigest: agent.memoryDigest,
        },
      };
      const sealed = await sealAgentIntel(packagePayload);
      const encryptedURI = sealed?.rootHash
        ? sealed.rootHash.startsWith("0g://") ||
          sealed.rootHash.startsWith("mem://")
          ? sealed.rootHash
          : `0g://${sealed.rootHash}`
        : USE_MOCKS
          ? `local://${agent.id}`
          : null;
      if (!encryptedURI) {
        setStatus("Storage seal failed — cannot mint without encryptedURI.");
        return null;
      }

      const metadataHash = keccak256(stringToHex(JSON.stringify(publicCard)));
      setStatus("Minting on 0G…");
      const nextBefore = (await publicClient.readContract({
        address: MAINNET_ADDRESSES.sekaiAgent,
        abi: sekaiAgentAbi,
        functionName: "nextTokenId",
      })) as bigint;
      const txHash = await writeContractAsync({
        address: MAINNET_ADDRESSES.sekaiAgent,
        abi: sekaiAgentAbi,
        functionName: "mint",
        args: [address, encryptedURI, metadataHash],
      });
      const receipt = await waitForOgReceipt(publicClient, txHash);
      if (receipt.status !== "success") {
        throw new Error("Mint transaction reverted on-chain.");
      }
      const tokenId = String(nextBefore);
      await registerAgentCard({
        tokenId,
        ownerAddress: address,
        ...publicCard,
        encryptedURI,
        metadataHash,
      });
      setStatus(`Minted dossier #${tokenId}`);
      return {
        tokenId,
        txHash: receipt.transactionHash,
        encryptedURI,
      };
    } catch (err) {
      setStatus(
        err instanceof Error
          ? `Mint skipped: ${err.message.slice(0, 120)}`
          : "Mint skipped.",
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
    storageUri?: string;
    localOnly: boolean;
    error?: string;
  }> {
    const submittedAt = Math.floor(Date.now() / 1000);
    const chainMissionId = missionChainId(input.mission);
    const tokenIdStr = input.agent.dossierNumber ?? null;
    const missionIdForHash = chainMissionId ?? input.mission.id;
    const agentTokenIdForHash = tokenIdStr ?? "0";

    const playHash = hashMissionPlayDraft({
      missionId: missionIdForHash,
      agentTokenId: agentTokenIdForHash,
      draft: input.draft,
      submittedAt,
    });

    const playBody = {
      missionId: missionIdForHash,
      agentTokenId: agentTokenIdForHash,
      approach: input.draft.approach,
      steps: input.draft.steps,
      risksAccepted: input.draft.risksAccepted,
      resourcesUsed: input.draft.resourcesUsed,
      contingencies: input.draft.contingencies,
      finalOutcomeClaim: input.draft.finalOutcomeClaim,
      playHash,
      submittedAt,
    };

    setStatus("Sealing orders to storage…");
    const sealed = await sealPlayToStorage(playBody);
    const storageUri = sealed?.rootHash ?? undefined;
    if (storageUri) {
      await recordPlayStorage({
        missionId: input.mission.id,
        agentTokenId: agentTokenIdForHash,
        playHash,
        storageUri,
        sealedJson: JSON.stringify(playBody),
      });
    }

    const onChainId = chainMissionId ? BigInt(chainMissionId) : null;
    const tokenId = tokenIdStr ? BigInt(tokenIdStr) : null;

    if (
      !address ||
      chainId !== OG_CHAIN_ID ||
      !publicClient ||
      onChainId == null ||
      tokenId == null
    ) {
      if (!USE_MOCKS && (onChainId == null || tokenId == null)) {
        const error =
          onChainId == null
            ? "Case has no on-chain mission id yet."
            : "Operative has no on-chain dossier number.";
        setStatus(error);
        return { playHash, storageUri, localOnly: true, error };
      }
      setStatus("Orders sealed on local desk (no on-chain mission id / token).");
      return { playHash, storageUri, localOnly: true };
    }

    try {
      const endsAtMs = new Date(input.mission.ends_at).getTime();
      const nowMs = Date.now();
      // #region agent log
      fetch("http://127.0.0.1:7600/ingest/f6ac1593-9cf9-472c-9362-2e12527cc795", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "86162c",
        },
        body: JSON.stringify({
          sessionId: "86162c",
          runId: "post-fix",
          hypothesisId: "A",
          location: "useChainActions.ts:sealOnChain-deadline",
          message: "seal deadline gate",
          data: {
            missionApiId: input.mission.id,
            title: input.mission.title,
            status: input.mission.status,
            onChainId: chainMissionId,
            ends_at: input.mission.ends_at,
            endsAtMs,
            nowMs,
            pastDeadline: Number.isFinite(endsAtMs) && nowMs >= endsAtMs,
            agentTokenId: tokenIdStr,
            agentCodename: input.agent.codename,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (Number.isFinite(endsAtMs) && nowMs >= endsAtMs) {
        const error =
          "Case deadline has passed — accept/submit window is closed. Create a new demo case in Bureau.";
        setStatus(error);
        return { playHash, storageUri, localOnly: true, error };
      }

      const entrant = (await publicClient.readContract({
        address: MAINNET_ADDRESSES.missionVault,
        abi: missionVaultAbi,
        functionName: "entrants",
        args: [onChainId, tokenId],
      })) as readonly [
        `0x${string}`,
        bigint,
        `0x${string}`,
        bigint,
        `0x${string}`,
        boolean,
        boolean,
        boolean,
        boolean,
      ];
      const alreadyAccepted = entrant[5];
      const alreadySubmitted = entrant[6];

      if (alreadySubmitted) {
        setStatus("Orders already on chain for this operative.");
        const onChainPlayHash = entrant[2];
        const zeroHash = `0x${"0".repeat(64)}` as const;
        return {
          playHash:
            onChainPlayHash && onChainPlayHash !== zeroHash
              ? onChainPlayHash
              : playHash,
          storageUri,
          localOnly: false,
        };
      }

      let acceptTxHash: string | undefined;
      if (!alreadyAccepted) {
        setStatus("Accepting case (paying mission tax)…");
        const value = weiStringToBigInt(input.mission.entry_fee_wei);
        acceptTxHash = await writeContractAsync({
          address: MAINNET_ADDRESSES.missionVault,
          abi: missionVaultAbi,
          functionName: "acceptMission",
          args: [onChainId, tokenId],
          value,
        });
        const acceptReceipt = await waitForOgReceipt(
          publicClient,
          acceptTxHash,
        );
        if (acceptReceipt.status !== "success") {
          throw new Error(
            `Accept reverted — check tax/window. Tx ${acceptTxHash.slice(0, 12)}…`,
          );
        }
      } else {
        setStatus("Already accepted — submitting orders…");
      }

      setStatus("Submitting sealed orders…");
      const submitTxHash = await writeContractAsync({
        address: MAINNET_ADDRESSES.missionVault,
        abi: missionVaultAbi,
        functionName: "submitPlay",
        args: [onChainId, tokenId, playHash],
      });
      const submitReceipt = await waitForOgReceipt(publicClient, submitTxHash);
      if (submitReceipt.status !== "success") {
        throw new Error(
          `Submit reverted. Tx ${submitTxHash.slice(0, 12)}…`,
        );
      }
      setStatus("Orders on chain.");
      return {
        playHash,
        acceptTxHash,
        submitTxHash,
        storageUri,
        localOnly: false,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message.slice(0, 200) : "Chain seal failed";
      setStatus(message);
      return { playHash, storageUri, localOnly: true, error: message };
    }
  }

  return { sealOnChain, status };
}

/** Reseal agent package to 0G Storage + admin updateMetadata via Nest. */
export function useSyncAgent() {
  const { address, chainId } = useAccount();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function syncAgent(agent: SquadAgent): Promise<{
    encryptedURI: string;
    txHash: string;
  } | null> {
    if (!address || chainId !== OG_CHAIN_ID) {
      setStatus("Connect wallet on 0G Mainnet to publish.");
      return null;
    }
    if (!agent.dossierNumber) {
      setStatus("No on-chain dossier — hire/mint first.");
      return null;
    }
    const rulesMax = standingRulesWordMax(agent.level);
    const rulesWords = countWords(agent.behaviorRules.join("\n"));
    if (rulesWords > rulesMax) {
      setStatus(`Standing rules over word budget (${rulesWords}/${rulesMax}).`);
      return null;
    }
    setBusy(true);
    setStatus("Publishing dossier to 0G Storage…");
    try {
      const result = await syncAgentPackage({
        tokenId: agent.dossierNumber,
        ownerAddress: address,
        publicCard: {
          name: agent.name,
          codename: agent.codename,
          archetype: agent.archetype,
          portraitId: agent.portraitId,
          publicSummary: agent.publicSummary,
          level: agent.level,
          xp: agent.xp,
          missionCount: agent.missionCount,
          winRate: agent.winRate,
        },
        privateIntel: {
          personality: agent.personality,
          skills: agent.skills,
          behaviorRules: agent.behaviorRules,
          memoryDigest: agent.memoryDigest,
        },
      });
      setStatus(`Published · ${result.txHash.slice(0, 10)}…`);
      return {
        encryptedURI: result.encryptedURI,
        txHash: result.txHash,
      };
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message.slice(0, 160)
          : "Publish failed.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { syncAgent, status, busy };
}

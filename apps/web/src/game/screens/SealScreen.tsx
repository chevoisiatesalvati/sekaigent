"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { COPY } from "@/lib/copy";
import { fetchMission, missionChainId } from "@/lib/api";
import { useUiStore } from "../stores/uiStore";
import { useLoadoutStore } from "../stores/loadoutStore";
import { useFieldStore } from "../stores/fieldStore";
import { useSquadStore } from "../stores/squadStore";
import { useSealOnChain } from "../hooks/useChainActions";

type SealPhase = "working" | "done" | "failed";

/**
 * Seal path:
 * 1) Encrypt MissionPlay JSON → API /storage/seal-play (0G Storage or memory)
 * 2) Record playHash + storage URI on the API
 * 3) If mission has on_chain_id + agent dossier #: acceptMission (tax) + submitPlay
 * 4) Persist deployment on Field desk
 *
 * Demo/API-only cases (no on_chain_id) stop at step 2 with a clear error — they
 * cannot pay mission tax on-chain until Bureau creates the case on MissionVault.
 */
export function SealScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const agentId = useUiStore((s) => s.selectedAgentId);
  const setScreen = useUiStore((s) => s.setScreen);
  const openBrief = useUiStore((s) => s.openBrief);
  const draft = useLoadoutStore((s) => s.draft);
  const resetLoadout = useLoadoutStore((s) => s.reset);
  const deploy = useFieldStore((s) => s.deploy);
  const agent = useSquadStore((s) =>
    s.agents.find((a) => a.id === agentId),
  );
  const { sealOnChain, status } = useSealOnChain();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SealPhase>("working");
  const [detail, setDetail] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!missionId || !agentId || !draft || !agent) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      const mission = await fetchMission(missionId);
      if (!mission || cancelled) {
        if (!cancelled) {
          setError("Case not found.");
          setPhase("failed");
        }
        return;
      }

      const chainId = missionChainId(mission);
      if (!chainId) {
        setError(
          "This case is not on-chain yet. Open Command (Bureau Ops) and create a live case, or pick a mission with an on-chain id.",
        );
        setDetail(`Local id: ${mission.id}`);
        setPhase("failed");
        return;
      }
      if (!agent.dossierNumber) {
        setError(
          "This operative has no on-chain dossier number. Hire/mint on 0G Mainnet first.",
        );
        setPhase("failed");
        return;
      }

      const result = await sealOnChain({ mission, agent, draft });
      if (cancelled) return;

      if (result.error || result.localOnly) {
        setError(
          result.error ??
            "Sealed to storage only — chain accept/submit did not complete.",
        );
        setDetail(
          [
            result.storageUri ? `Storage: ${result.storageUri.slice(0, 18)}…` : null,
            result.playHash ? `playHash: ${result.playHash.slice(0, 12)}…` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        );
        // Still record a local field row so the attempt is visible
        deploy(missionId, agentId, draft, {
          playHash: result.playHash,
          acceptTxHash: result.acceptTxHash,
          submitTxHash: result.submitTxHash,
          chainError: result.error ?? "local_only",
        });
        setPhase("failed");
        return;
      }

      deploy(missionId, agentId, draft, {
        playHash: result.playHash,
        acceptTxHash: result.acceptTxHash,
        submitTxHash: result.submitTxHash,
      });
      resetLoadout();
      setDetail(
        [
          result.acceptTxHash
            ? `Accept ${result.acceptTxHash.slice(0, 10)}…`
            : null,
          result.submitTxHash
            ? `Submit ${result.submitTxHash.slice(0, 10)}…`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      setPhase("done");
      window.setTimeout(() => {
        if (!cancelled) setScreen("field");
      }, 1400);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    missionId,
    agentId,
    draft,
    agent,
    deploy,
    resetLoadout,
    setScreen,
    sealOnChain,
  ]);

  return (
    <div className="seal-stage">
      <motion.div
        className="seal-stamp"
        initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
        animate={{
          scale: 1,
          rotate: phase === "failed" ? -8 : 0,
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
      >
        {phase === "failed" ? "Hold" : "Sealed"}
      </motion.div>
      <motion.p
        className="panel-sub"
        style={{ marginTop: "1.25rem", textAlign: "center", maxWidth: "28rem" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {phase === "working" &&
          (status ?? `${COPY.sealDeploy} — packing field plan…`)}
        {phase === "done" &&
          (status ?? "Orders on chain. Moving to Field…")}
        {phase === "failed" &&
          "Deployment did not finish on-chain. Read the note below."}
      </motion.p>
      {detail && (
        <p className="empty-note" style={{ marginTop: "0.5rem" }}>
          {detail}
        </p>
      )}
      {error && (
        <p
          className="empty-note"
          style={{ marginTop: "0.75rem", maxWidth: "28rem", textAlign: "center" }}
        >
          {error}
        </p>
      )}
      {phase === "failed" && missionId && (
        <div className="action-row" style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => openBrief(missionId)}
          >
            Back to case
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setScreen("hq")}
          >
            Open Bureau Ops
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setScreen("field")}
          >
            Field desk
          </button>
        </div>
      )}
    </div>
  );
}

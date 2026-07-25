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
 */
export function SealScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const agentId = useUiStore((s) => s.selectedAgentId);
  const setScreen = useUiStore((s) => s.setScreen);
  const openBrief = useUiStore((s) => s.openBrief);
  const openLoadout = useUiStore((s) => s.openLoadout);
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
  const runId = useRef(0);

  useEffect(() => {
    return () => {
      // Allow retry when leaving and re-entering Seal
      started.current = false;
    };
  }, []);

  useEffect(() => {
    if (started.current) return;

    if (!missionId || !agentId) {
      setError("Missing case or operative.");
      setPhase("failed");
      started.current = true;
      return;
    }
    if (!draft) {
      setError(
        "No sealed orders draft. Go back to the Orders desk and brief the operative first.",
      );
      setPhase("failed");
      started.current = true;
      return;
    }
    if (!agent) {
      setError("Operative not found on the desk.");
      setPhase("failed");
      started.current = true;
      return;
    }

    started.current = true;
    const thisRun = ++runId.current;
    let cancelled = false;

    (async () => {
      const mission = await fetchMission(missionId);
      if (cancelled || thisRun !== runId.current) return;
      if (!mission) {
        setError("Case not found.");
        setPhase("failed");
        return;
      }

      const chainId = missionChainId(mission);
      if (!chainId) {
        setError(
          "This case is not on-chain yet. Open Bureau, create a live case, then seal against that mission.",
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
      if (cancelled || thisRun !== runId.current) return;

      if (result.error || result.localOnly) {
        setError(
          result.error ??
            "Sealed to storage only — chain accept/submit did not complete.",
        );
        setDetail(
          [
            result.storageUri
              ? `Storage: ${result.storageUri.slice(0, 18)}…`
              : null,
            result.playHash ? `playHash: ${result.playHash.slice(0, 12)}…` : null,
            result.acceptTxHash
              ? `Accept ${result.acceptTxHash.slice(0, 10)}…`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        );
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
        if (!cancelled && thisRun === runId.current) setScreen("field");
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

  function retry() {
    started.current = false;
    setPhase("working");
    setError(null);
    setDetail(null);
    // bump run so effect re-fires
    runId.current += 1;
    if (missionId && agentId) {
      openLoadout(missionId);
    }
  }

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
        {phase === "done" && (status ?? "Orders on chain. Moving to Field…")}
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
          style={{
            marginTop: "0.75rem",
            maxWidth: "28rem",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
      {phase === "failed" && (
        <div className="action-row" style={{ marginTop: "1.25rem" }}>
          {missionId && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => openBrief(missionId)}
            >
              Back to case
            </button>
          )}
          {missionId && draft && (
            <button type="button" className="btn" onClick={retry}>
              Back to orders
            </button>
          )}
          <button
            type="button"
            className="btn ghost"
            onClick={() => setScreen("hq")}
          >
            Open Bureau
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

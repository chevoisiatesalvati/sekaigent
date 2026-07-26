"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COPY } from "@/lib/copy";
import { fetchMission, missionChainId, type MissionListItem } from "@/lib/api";
import { useUiStore } from "../stores/uiStore";
import { useLoadoutStore } from "../stores/loadoutStore";
import { useFieldStore } from "../stores/fieldStore";
import { useSquadStore, agentPortraitSrc } from "../stores/squadStore";
import { useSealOnChain } from "../hooks/useChainActions";
import { useIsVaultAdmin } from "../hooks/useIsVaultAdmin";
import type { MissionPlayDraft } from "../types";

type SealPhase = "working" | "done" | "failed";

type SealJobResult = {
  ok: boolean;
  error?: string;
  detail?: string | null;
  playHash?: `0x${string}`;
  acceptTxHash?: string;
  submitTxHash?: string;
  storageUri?: string;
  localOnly?: boolean;
};

/** Share one accept/submit across React Strict Mode remounts. */
const sealJobs = new Map<string, Promise<SealJobResult>>();

/**
 * Seal path:
 * 1) Encrypt MissionPlay JSON → API /storage/seal-play (0G Storage or memory)
 * 2) Record playHash + storage URI on the API
 * 3) If mission has on_chain_id + agent dossier #: acceptMission (tax) + submitPlay
 * 4) Persist deployment on Field desk → return to case file
 *
 * Note: avoid useEffectEvent — Next's compiled React client may not export it.
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
  const { isAdmin } = useIsVaultAdmin();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SealPhase>("working");
  const [detail, setDetail] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const mounted = useRef(true);

  /** Latest deps for the seal effect without restarting the job on status ticks. */
  const latestRef = useRef({
    deploy,
    resetLoadout,
    openBrief,
    sealOnChain,
  });
  latestRef.current = { deploy, resetLoadout, openBrief, sealOnChain };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!missionId || !agentId) {
      setError("Missing case or operative.");
      setPhase("failed");
      return;
    }
    if (!draft) {
      setError(
        "No sealed orders draft. Go back to the Orders desk and brief the operative first.",
      );
      setPhase("failed");
      return;
    }
    if (!agent) {
      setError("Operative not found on the desk.");
      setPhase("failed");
      return;
    }

    setPhase("working");
    setError(null);
    setDetail(null);

    const jobKey = `${missionId}:${agentId}:${retryToken}`;
    const draftSnapshot = draft;
    const agentSnapshot = agent;

    const existing = sealJobs.get(jobKey);
    const job =
      existing ??
      (async (): Promise<SealJobResult> => {
        const mission = await fetchMission(missionId);
        if (!mission) {
          return { ok: false, error: "Case not found." };
        }

        const chainId = missionChainId(mission);
        if (!chainId) {
          return {
            ok: false,
            error:
              "This case is not on-chain yet. Open Bureau, create a live case, then seal against that mission.",
            detail: `Local id: ${mission.id}`,
          };
        }
        if (!agentSnapshot.dossierNumber) {
          return {
            ok: false,
            error:
              "This operative has no on-chain dossier number. Hire/mint on 0G Mainnet first.",
          };
        }

        const result = await latestRef.current.sealOnChain({
          mission: mission as MissionListItem,
          agent: agentSnapshot,
          draft: draftSnapshot,
        });

        const detailLine =
          [
            result.acceptTxHash
              ? `Accept ${result.acceptTxHash.slice(0, 10)}…`
              : null,
            result.submitTxHash
              ? `Submit ${result.submitTxHash.slice(0, 10)}…`
              : null,
            result.storageUri && (result.error || result.localOnly)
              ? `Storage: ${result.storageUri.slice(0, 18)}…`
              : null,
            result.playHash && (result.error || result.localOnly)
              ? `playHash: ${result.playHash.slice(0, 12)}…`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || null;

        if (result.error) {
          return {
            ok: false,
            error: result.error,
            detail: detailLine,
            playHash: result.playHash,
            acceptTxHash: result.acceptTxHash,
            submitTxHash: result.submitTxHash,
            storageUri: result.storageUri,
            localOnly: result.localOnly,
          };
        }

        return {
          ok: true,
          detail: detailLine,
          playHash: result.playHash,
          acceptTxHash: result.acceptTxHash,
          submitTxHash: result.submitTxHash,
          storageUri: result.storageUri,
          localOnly: result.localOnly,
        };
      })();

    if (!existing) {
      sealJobs.set(jobKey, job);
      void job.finally(() => {
        window.setTimeout(() => {
          sealJobs.delete(jobKey);
        }, 8_000);
      });
    }

    void job.then((result) => {
      const { deploy: deployFn, resetLoadout: resetFn, openBrief: briefFn } =
        latestRef.current;
      if (result.ok) {
        deployFn(missionId, agentId, draftSnapshot, {
          playHash: result.playHash,
          acceptTxHash: result.acceptTxHash,
          submitTxHash: result.submitTxHash,
        });
        resetFn();
        setDetail(result.detail ?? null);
        setPhase("done");
        window.setTimeout(() => {
          if (mounted.current) briefFn(missionId);
        }, 1800);
        return;
      }

      // Failed seal must not lock the operative on the Field desk.
      setError(result.error ?? "Deployment did not finish on-chain.");
      setDetail(result.detail ?? null);
      setPhase("failed");
    });
    // Intentionally omit draft/agent/sealOnChain: status ticks re-render the
    // screen and must not restart or cancel this job.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seal once per attempt
  }, [missionId, agentId, retryToken]);

  function retry() {
    if (missionId && agentId) {
      sealJobs.delete(`${missionId}:${agentId}:${retryToken}`);
    }
    setRetryToken((n) => n + 1);
    if (missionId) openLoadout(missionId);
  }

  const statusLine =
    phase === "working"
      ? (status ?? COPY.sealDeploying)
      : phase === "done"
        ? `${COPY.sealDeployed}${agent ? ` — ${agent.codename}` : ""}. ${COPY.sealRedirectBrief}`
        : "Deployment did not finish on-chain. Read the note below.";

  return (
    <div className="seal-stage">
      <AnimatePresence mode="wait">
        {phase === "working" && (
          <motion.div
            key="working"
            className="seal-deploy-visual"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28 }}
          >
            <div className="seal-orbit" aria-hidden>
              <span className="seal-orbit-ring" />
              <span className="seal-orbit-ring delay" />
              <span className="seal-orbit-dot" />
            </div>
            {agent && (
              <img
                className="seal-agent-thumb"
                src={agentPortraitSrc(agent)}
                alt=""
                width={72}
                height={72}
              />
            )}
          </motion.div>
        )}
        {phase === "done" && (
          <motion.div
            key="done"
            className="seal-deploy-visual success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="seal-success-ring" aria-hidden />
            {agent && (
              <img
                className="seal-agent-thumb"
                src={agentPortraitSrc(agent)}
                alt=""
                width={72}
                height={72}
              />
            )}
            <span className="seal-success-label">Deployed</span>
          </motion.div>
        )}
        {phase === "failed" && (
          <motion.div
            key="failed"
            className="seal-stamp failed"
            initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            Hold
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        className="panel-sub"
        style={{ marginTop: "1.25rem", textAlign: "center", maxWidth: "28rem" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {statusLine}
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
          {isAdmin && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => setScreen("hq")}
            >
              Open Bureau
            </button>
          )}
          <button
            type="button"
            className="btn ghost"
            onClick={() => setScreen("field")}
          >
            Field desk
          </button>
        </div>
      )}
      {phase === "done" && missionId && (
        <button
          type="button"
          className="btn"
          style={{ marginTop: "1rem" }}
          onClick={() => openBrief(missionId)}
        >
          Open case file
        </button>
      )}
    </div>
  );
}

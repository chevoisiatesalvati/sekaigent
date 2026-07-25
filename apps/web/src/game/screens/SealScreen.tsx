"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { COPY } from "@/lib/copy";
import { fetchMission } from "@/lib/api";
import { useUiStore } from "../stores/uiStore";
import { useLoadoutStore } from "../stores/loadoutStore";
import { useFieldStore } from "../stores/fieldStore";
import { useSquadStore } from "../stores/squadStore";
import { useSealOnChain } from "../hooks/useChainActions";

export function SealScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const agentId = useUiStore((s) => s.selectedAgentId);
  const setScreen = useUiStore((s) => s.setScreen);
  const draft = useLoadoutStore((s) => s.draft);
  const resetLoadout = useLoadoutStore((s) => s.reset);
  const deploy = useFieldStore((s) => s.deploy);
  const agent = useSquadStore((s) =>
    s.agents.find((a) => a.id === agentId),
  );
  const { sealOnChain, status } = useSealOnChain();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!missionId || !agentId || !draft || !agent) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      const mission = await fetchMission(missionId);
      if (!mission || cancelled) {
        if (!cancelled) setError("Case not found.");
        return;
      }

      const result = await sealOnChain({ mission, agent, draft });
      if (cancelled) return;
      if (result.error) setError(result.error);

      deploy(missionId, agentId, draft, {
        playHash: result.playHash,
        acceptTxHash: result.acceptTxHash,
        submitTxHash: result.submitTxHash,
        chainError: result.error,
      });
      resetLoadout();
      window.setTimeout(() => {
        if (!cancelled) setScreen("field");
      }, 900);
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
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
      >
        Sealed
      </motion.div>
      <motion.p
        className="panel-sub"
        style={{ marginTop: "1.25rem", textAlign: "center" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {status ?? `${COPY.sealDeploy} — packing field plan…`}
      </motion.p>
      {error && (
        <p className="empty-note" style={{ marginTop: "0.75rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}

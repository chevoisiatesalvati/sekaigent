"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { COPY } from "@/lib/copy";
import { useUiStore } from "../stores/uiStore";
import { useLoadoutStore } from "../stores/loadoutStore";
import { useFieldStore } from "../stores/fieldStore";

export function SealScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const agentId = useUiStore((s) => s.selectedAgentId);
  const setScreen = useUiStore((s) => s.setScreen);
  const draft = useLoadoutStore((s) => s.draft);
  const resetLoadout = useLoadoutStore((s) => s.reset);
  const deploy = useFieldStore((s) => s.deploy);

  useEffect(() => {
    if (!missionId || !agentId || !draft) return;
    const timer = window.setTimeout(() => {
      deploy(missionId, agentId, draft);
      resetLoadout();
      setScreen("field");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [missionId, agentId, draft, deploy, resetLoadout, setScreen]);

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
        {COPY.sealDeploy} — packing field plan…
      </motion.p>
    </div>
  );
}

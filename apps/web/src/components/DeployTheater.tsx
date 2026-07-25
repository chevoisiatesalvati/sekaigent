"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { COPY } from "@/lib/copy";
import { OG_CHAIN_ID } from "@/lib/chain";
import { formatOgFromWei } from "@/lib/format";
import {
  getDeploymentForMission,
  markInField,
  type FieldDeployment,
} from "@/lib/field-ops";
import {
  agentPortraitSrc,
  loadSquad,
  ownerStorageKey,
  type SquadAgent,
} from "@/lib/squad";
import { StatusChip } from "./StatusChip";

type Phase = "pick" | "confirm" | "sealing" | "stamped" | "done";

export function DeployTheater({
  missionId,
  entryFeeWei,
  missionTitle,
}: {
  missionId: string;
  entryFeeWei: string;
  missionTitle: string;
}) {
  const { address, chainId, isConnected } = useAccount();
  const ownerKey = ownerStorageKey(address);
  const onChain = isConnected && chainId === OG_CHAIN_ID;

  const [squad, setSquad] = useState<SquadAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [deployment, setDeployment] = useState<FieldDeployment | null>(null);

  useEffect(() => {
    setSquad(loadSquad(ownerKey));
    const existing = getDeploymentForMission(ownerKey, missionId);
    if (existing) {
      setDeployment(existing);
      setSelectedId(existing.agentId);
      setPhase("done");
    }
  }, [ownerKey, missionId]);

  const selected = useMemo(
    () => squad.find((a) => a.id === selectedId) ?? null,
    [squad, selectedId],
  );

  useEffect(() => {
    if (phase !== "sealing") return;
    const timer = window.setTimeout(() => {
      if (!selected) return;
      const row = markInField(ownerKey, missionId, selected.id);
      setDeployment(row);
      setPhase("stamped");
      window.setTimeout(() => setPhase("done"), 500);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [phase, selected, ownerKey, missionId]);

  if (phase === "done" && deployment && selected) {
    return (
      <section id="deploy" className="panel stack">
        <div className="page-head">
          <h2 style={{ margin: 0 }}>{COPY.inTheField}</h2>
          <StatusChip status="in_field" label={COPY.inTheField} />
        </div>
        <div className="deploy-stage stamped">
          <div className="seal-ring">Dispatched</div>
          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            <strong>{selected.codename}</strong> is working{" "}
            <em>{missionTitle}</em>. Field plan sealed until debrief.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="deploy" className="panel stack">
      <h2>{COPY.deployCta}</h2>
      {!onChain && <p className="muted">{COPY.connectWallet}</p>}

      {(phase === "pick" || phase === "confirm") && (
        <>
          <p className="muted" style={{ margin: 0 }}>
            Choose an operative. Stake{" "}
            <strong>{formatOgFromWei(entryFeeWei)}</strong> (shell preview —
            chain deploy comes later).
          </p>
          <div className="agent-pick-grid">
            {squad.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className="agent-pick"
                aria-pressed={selectedId === agent.id}
                onClick={() => {
                  setSelectedId(agent.id);
                  setPhase("confirm");
                }}
              >
                <img src={agentPortraitSrc(agent)} alt="" />
                <strong>{agent.codename}</strong>
                <span className="muted" style={{ display: "block" }}>
                  {agent.archetype} · Lv {agent.level}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "confirm" && selected && (
        <div className="stack">
          <p>
            Send <strong>{selected.codename}</strong> into{" "}
            <strong>{missionTitle}</strong>? Entry stake{" "}
            {formatOgFromWei(entryFeeWei)}.
          </p>
          <div className="hq-actions">
            <button
              type="button"
              className="btn signal"
              disabled={!onChain}
              onClick={() => setPhase("sealing")}
            >
              {COPY.sealDeploy}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setPhase("pick")}
            >
              Choose another
            </button>
          </div>
        </div>
      )}

      {(phase === "sealing" || phase === "stamped") && selected && (
        <div className={`deploy-stage ${phase}`}>
          <div className="seal-ring">
            {phase === "sealing" ? "Sealing" : "Stamp"}
          </div>
          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            {phase === "sealing"
              ? `Sealing field plan for ${selected.codename}…`
              : "Dispatch stamped."}
          </p>
        </div>
      )}
    </section>
  );
}

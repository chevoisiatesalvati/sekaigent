"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { StatusChip } from "@/components/StatusChip";
import { TradecraftMeters } from "@/components/TradecraftMeters";
import { COPY } from "@/lib/copy";
import { formatWinRate } from "@/lib/format";
import { getDeploymentForAgent } from "@/lib/field-ops";
import {
  agentPortraitSrc,
  getAgent,
  ownerStorageKey,
  type SquadAgent,
} from "@/lib/squad";

export function AgentDossier({ agentId }: { agentId: string }) {
  const { address } = useAccount();
  const ownerKey = ownerStorageKey(address);
  const [agent, setAgent] = useState<SquadAgent | null>(null);
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    setAgent(getAgent(ownerKey, agentId) ?? null);
    setDeployed(Boolean(getDeploymentForAgent(ownerKey, agentId)));
  }, [ownerKey, agentId]);

  if (!agent) {
    return (
      <main className="stack">
        <h1>Operative not found</h1>
        <p className="muted">This dossier is not in your squad.</p>
        <Link className="btn secondary" href="/squad">
          Back to squad
        </Link>
      </main>
    );
  }

  return (
    <main className="stack">
      <div className="page-head">
        <div>
          <p className="muted" style={{ margin: 0 }}>
            {agent.archetype}
            {agent.dossierNumber
              ? ` · ${COPY.dossierFinePrint(agent.dossierNumber)}`
              : ""}
          </p>
          <h1 style={{ margin: "0.2rem 0" }}>{agent.codename}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {agent.name}
          </p>
        </div>
        <StatusChip
          status={deployed ? "in_field" : "open"}
          label={deployed ? COPY.readinessDeployed : COPY.readinessReady}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 260px) 1fr",
          gap: "1.25rem",
        }}
      >
        <img
          className="portrait"
          src={agentPortraitSrc(agent)}
          alt=""
          style={{
            width: "100%",
            aspectRatio: "4 / 5",
            objectFit: "cover",
            border: "1px solid var(--line)",
          }}
        />
        <div className="stack">
          <p>{agent.publicSummary}</p>
          <div className="dossier-meta">
            <span>Level {agent.level}</span>
            <span className="muted">{agent.xp} XP</span>
            <span className="muted">{formatWinRate(agent.winRate)}</span>
            <span className="muted">{agent.missionCount} missions</span>
          </div>
          <div>
            <Link className="btn" href="/missions">
              {COPY.deployCta}
            </Link>
          </div>
        </div>
      </div>
      <section className="panel stack">
        <h2>Tradecraft</h2>
        <TradecraftMeters skills={agent.skills} />
      </section>
    </main>
  );
}

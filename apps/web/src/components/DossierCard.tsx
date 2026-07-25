import Link from "next/link";
import { StatusChip } from "./StatusChip";
import { formatWinRate } from "@/lib/format";
import { agentPortraitSrc, type SquadAgent } from "@/lib/squad";
import { COPY } from "@/lib/copy";

export function DossierCard({
  agent,
  readiness,
}: {
  agent: SquadAgent;
  readiness?: "ready" | "deployed";
}) {
  const src = agentPortraitSrc(agent);
  return (
    <Link href={`/squad/${agent.id}`} className="dossier-card">
      <img className="portrait" src={src} alt="" />
      <div>
        <p className="codename">{agent.codename}</p>
        <p className="muted" style={{ margin: "0.15rem 0 0" }}>
          {agent.name} · {agent.archetype}
        </p>
      </div>
      <div className="dossier-meta">
        <StatusChip
          status={readiness === "deployed" ? "in_field" : "open"}
          label={
            readiness === "deployed"
              ? COPY.readinessDeployed
              : COPY.readinessReady
          }
        />
        <span className="muted">Lv {agent.level}</span>
        <span className="muted">{formatWinRate(agent.winRate)}</span>
        <span className="muted">{agent.missionCount} missions</span>
      </div>
    </Link>
  );
}

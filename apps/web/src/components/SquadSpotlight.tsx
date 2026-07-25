"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { DossierCard } from "./DossierCard";
import { getDeploymentForAgent } from "@/lib/field-ops";
import { loadSquad, ownerStorageKey, type SquadAgent } from "@/lib/squad";

export function SquadSpotlight() {
  const { address } = useAccount();
  const ownerKey = ownerStorageKey(address);
  const [squad, setSquad] = useState<SquadAgent[]>([]);

  useEffect(() => {
    setSquad(loadSquad(ownerKey).slice(0, 3));
  }, [ownerKey]);

  if (squad.length === 0) {
    return (
      <p className="muted">
        Empty desk.{" "}
        <Link href="/squad/recruit">Recruit your first operative</Link>.
      </p>
    );
  }

  return (
    <div className="stack">
      <div className="roster-grid">
        {squad.map((agent) => (
          <DossierCard
            key={agent.id}
            agent={agent}
            readiness={
              getDeploymentForAgent(ownerKey, agent.id) ? "deployed" : "ready"
            }
          />
        ))}
      </div>
      <Link className="btn secondary" href="/squad">
        Full squad
      </Link>
    </div>
  );
}

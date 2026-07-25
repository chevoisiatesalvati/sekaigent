"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { DossierCard } from "./DossierCard";
import { COPY } from "@/lib/copy";
import { getDeploymentForAgent } from "@/lib/field-ops";
import {
  loadSquad,
  ownerStorageKey,
  type SquadAgent,
} from "@/lib/squad";

export function SquadRoster() {
  const { address } = useAccount();
  const [squad, setSquad] = useState<SquadAgent[]>([]);
  const ownerKey = ownerStorageKey(address);

  useEffect(() => {
    setSquad(loadSquad(ownerKey));
  }, [ownerKey]);

  if (squad.length === 0) {
    return (
      <div className="stack">
        <p>{COPY.squadEmpty}</p>
        <Link className="btn" href="/squad/recruit">
          Recruit
        </Link>
      </div>
    );
  }

  return (
    <div className="roster-grid">
      {squad.map((agent) => {
        const deployed = getDeploymentForAgent(ownerKey, agent.id);
        return (
          <DossierCard
            key={agent.id}
            agent={agent}
            readiness={deployed ? "deployed" : "ready"}
          />
        );
      })}
    </div>
  );
}

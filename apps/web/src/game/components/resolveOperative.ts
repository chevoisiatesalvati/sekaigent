"use client";

import { useSquadStore } from "../stores/squadStore";

/** Resolve dossier/token id to a player-facing codename when known. */
export function resolveOperativeLabel(agentTokenId: string): string {
  const agents = useSquadStore.getState().agents;
  const match = agents.find(
    (a) => a.dossierNumber === agentTokenId || a.id === agentTokenId,
  );
  return match?.codename ?? `Dossier #${agentTokenId}`;
}

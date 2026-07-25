import type { Archetype } from "@/lib/portraits";

/** Quaternius Ultimate Modular Men (CC0) — mapped to Sekaigent archetypes. */
export const AGENT_MODEL_BY_ARCHETYPE: Record<Archetype, string> = {
  Infiltrator: "/models/agents/Adventurer.glb",
  Handler: "/models/agents/Suit.glb",
  Forger: "/models/agents/Worker.glb",
  Watcher: "/models/agents/Swat.glb",
  Ghost: "/models/agents/Punk.glb",
};

export const AGENT_MODEL_ATTRIBUTION =
  "Character models: Ultimate Modular Men by Quaternius (CC0).";

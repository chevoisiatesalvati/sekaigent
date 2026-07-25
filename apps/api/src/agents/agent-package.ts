/**
 * Canonical sealed package stored at SekaiAgent.encryptedURI on 0G Storage.
 * Plan: public card is discoverable after decrypt; private intel stays sealed.
 * metadataHash on-chain = keccak256(JSON.stringify(publicCard)).
 */
export type AgentPublicCardPayload = {
  name: string;
  codename: string;
  archetype: string;
  portraitId: string;
  publicSummary: string;
  level?: number;
  xp?: number;
  missionCount?: number;
  winRate?: number;
};

export type AgentPrivateIntelPayload = {
  personality: string;
  skills: {
    infiltration: number;
    socialEngineering: number;
    forgery: number;
    surveillance: number;
    exfiltration: number;
    tech: number;
    combatRestraint: number;
  };
  behaviorRules: string[];
  memoryDigest: string;
};

export type AgentStoragePackage = {
  version: 1;
  publicCard: AgentPublicCardPayload;
  privateIntel: AgentPrivateIntelPayload;
};

export function isAgentStoragePackage(
  value: unknown,
): value is AgentStoragePackage {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const card = obj.publicCard ?? obj.public;
  if (!card || typeof card !== "object") return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.name === "string" &&
    typeof c.codename === "string" &&
    typeof c.archetype === "string"
  );
}

export function parsePublicCard(
  value: unknown,
): AgentPublicCardPayload | null {
  if (!isAgentStoragePackage(value) && !(value && typeof value === "object")) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  const card = (obj.publicCard ?? obj.public ?? null) as Record<
    string,
    unknown
  > | null;
  if (!card) return null;
  if (typeof card.name !== "string" || typeof card.codename !== "string") {
    return null;
  }
  return {
    name: String(card.name),
    codename: String(card.codename).toUpperCase(),
    archetype: String(card.archetype ?? "Infiltrator"),
    portraitId: String(card.portraitId ?? card.portrait ?? "inf-01"),
    publicSummary: String(card.publicSummary ?? ""),
    level: Number(card.level ?? 1),
    xp: Number(card.xp ?? 0),
    missionCount: Number(card.missionCount ?? 0),
    winRate: Number(card.winRate ?? 0),
  };
}

export function parsePrivateIntel(
  value: unknown,
): AgentPrivateIntelPayload | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const intel = (obj.privateIntel ?? obj) as Record<string, unknown>;
  if (typeof intel.personality !== "string" || !intel.skills) return null;
  const skills = intel.skills as Record<string, number>;
  return {
    personality: String(intel.personality),
    skills: {
      infiltration: Number(skills.infiltration ?? 50),
      socialEngineering: Number(skills.socialEngineering ?? 50),
      forgery: Number(skills.forgery ?? 50),
      surveillance: Number(skills.surveillance ?? 50),
      exfiltration: Number(skills.exfiltration ?? 50),
      tech: Number(skills.tech ?? 50),
      combatRestraint: Number(skills.combatRestraint ?? 50),
    },
    behaviorRules: Array.isArray(intel.behaviorRules)
      ? intel.behaviorRules.map(String)
      : [],
    memoryDigest: String(intel.memoryDigest ?? ""),
  };
}

/** Player-facing labels — game language only, never DeFi/contract jargon. */

export const SKILL_LABELS = {
  infiltration: "Infiltration",
  socialEngineering: "Social engineering",
  forgery: "Forgery",
  surveillance: "Surveillance",
  exfiltration: "Exfiltration",
  tech: "Tech",
  combatRestraint: "Combat restraint",
} as const;

export type SkillKey = keyof typeof SKILL_LABELS;

export const RUBRIC_LABELS = {
  objectiveFit: "Objective fit",
  constraintCompliance: "Constraint discipline",
  tradecraftQuality: "Tradecraft",
  characterConsistency: "Character",
} as const;

export type RubricKey = keyof typeof RUBRIC_LABELS;

export const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  open: "Open",
  evaluating: "In review",
  settled: "Debriefed",
  cancelled: "Scrubbed",
};

export const DURATION_LABELS: Record<string, string> = {
  daily: "Daily case",
  weekly: "Weekly case",
  monthly: "Monthly case",
};

export const REGION_LORE: Record<string, string> = {
  harbor: "Fog docks and sealed crates — quiet work after midnight.",
  embassy: "Neutral ground with loud rooms and soft knives.",
  archive: "Ash-stained stacks where redacted pages still burn.",
  station: "Relay towers that never sleep; signals go both ways.",
};

export const COPY = {
  brandTagline: "Masters of secret agents on 0G",
  commandTitle: "Command",
  commandLead:
    "Hire and train operatives, then send them into open cases.",
  hqHeadline: "Hire and train operatives. Then open a case.",
  hqCtaSquad: "Open squad",
  hqCtaMissions: "Open cases",
  hqCtaHire: "Hire an operative",
  hqCtaCases: "Open a case",
  hqCtaField: "Check deployments",
  squadTitle: "Squad",
  squadEmpty: "No operatives yet — hire your first agent.",
  recruitTitle: "Hire operative",
  recruitCta: "Hire to squad",
  dossierFinePrint: (n: string) => `Dossier #${n}`,
  missionsTitle: "Cases",
  briefingTitle: "Case file",
  debriefTitle: "Debrief",
  entryStake: "Mission tax",
  purse: "Prize fund",
  window: "Deadline",
  openCases: "Open cases",
  fieldStatus: "Active deployments",
  classifiedSealed: "Hidden criteria sealed until debrief.",
  fieldPlanSealed: "Orders sealed until debrief.",
  deployCta: "Write mission orders",
  sealDeploy: "Seal orders",
  inTheField: "In the field",
  ordersTitle: "Mission orders",
  bureauTitle: "Bureau",
  bureauSubtitle: "Season standings from completed debriefs.",
  readinessReady: "Ready",
  readinessDeployed: "Deployed",
  connectWallet: "Connect wallet on 0G Mainnet to continue.",
  mapHint: "Open cases pulse on the globe — click a pin to open the case file.",
  localDesk: "Local desk",
  personalityLocked: "Set at hire — locked for this operative.",
} as const;

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function durationLabel(duration: string): string {
  return DURATION_LABELS[duration] ?? duration;
}

export function regionLore(regionId: string): string {
  return REGION_LORE[regionId] ?? "Uncharted sector.";
}

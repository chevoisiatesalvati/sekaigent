/** Player-facing labels — never show contract/backend jargon in UI. */

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
  daily: "Daily window",
  weekly: "Weekly window",
  monthly: "Monthly window",
};

export const REGION_LORE: Record<string, string> = {
  harbor: "Fog docks and sealed crates — quiet work after midnight.",
  embassy: "Neutral ground with loud rooms and soft knives.",
  archive: "Ash-stained stacks where redacted pages still burn.",
  station: "Relay towers that never sleep; signals go both ways.",
};

export const COPY = {
  brandTagline: "Masters of secret agents on 0G",
  hqHeadline: "Your desk. Your operatives. The field awaits.",
  hqCtaSquad: "Open squad",
  hqCtaMissions: "Mission board",
  squadTitle: "Squad",
  squadEmpty: "No operatives yet — recruit your first agent.",
  recruitTitle: "Recruit operative",
  recruitCta: "Recruit to squad",
  dossierFinePrint: (n: string) => `Dossier #${n}`,
  missionsTitle: "Mission board",
  briefingTitle: "Briefing",
  debriefTitle: "Debrief",
  entryStake: "Entry stake",
  purse: "Purse",
  window: "Window",
  fieldStatus: "Field status",
  classifiedSealed: "Classified briefing sealed until debrief.",
  fieldPlanSealed: "Field plan sealed until debrief.",
  deployCta: "Send into the field",
  sealDeploy: "Seal & deploy",
  inTheField: "In the field",
  bureauTitle: "Bureau",
  bureauSubtitle: "Season standings from completed debriefs.",
  readinessReady: "Ready",
  readinessDeployed: "Deployed",
  connectWallet: "Connect wallet on 0G Mainnet to continue.",
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

/** Level-gated word budgets for standing rules and mission orders. */

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Standing behaviour rules: 15 + (level - 1) * 5 */
export function standingRulesWordMax(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 15 + (safeLevel - 1) * 5;
}

/**
 * Mission orders free text: 50 + (level - 1) * 10
 * Room for approach + steps after reading a dossier; starts empty so budget is usable.
 */
export function missionOrdersWordMax(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 50 + (safeLevel - 1) * 10;
}

export type MissionOrdersWordSource = {
  approach: string;
  steps: Array<{ action: string; detail: string }>;
  risksAccepted: string[];
  resourcesUsed: string[];
  contingencies: string[];
  finalOutcomeClaim: string;
};

/** Count words that consume the mission-orders budget.
 * Step action labels are short categories and do not count — only details do.
 */
export function countMissionOrdersWords(
  draft: MissionOrdersWordSource,
): number {
  const blob = [
    draft.approach,
    ...draft.steps.map((s) => s.detail),
    ...draft.risksAccepted,
    ...draft.resourcesUsed,
    ...draft.contingencies,
    draft.finalOutcomeClaim,
  ].join(" ");
  return countWords(blob);
}

export function wordsRemaining(used: number, max: number): number {
  return Math.max(0, max - used);
}

export function isWithinWordBudget(text: string, max: number): boolean {
  return countWords(text) <= max;
}

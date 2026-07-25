export type PersonalityPreset = {
  id: string;
  name: string;
  personality: string;
  behaviorRules: string[];
};

/** Curated hire-time personalities — player must pick one; locked after hire. */
export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    id: "ice-quiet",
    name: "Ice Quiet",
    personality:
      "Speaks little, moves less. Calm under pressure; distrusts improvisation.",
    behaviorRules: [
      "Prefer silence over charm",
      "Abort if cover requires a scene",
    ],
  },
  {
    id: "charm-front",
    name: "Charm Front",
    personality:
      "Warm smile, cold ledger. Reads rooms before doors; never rushes a mark.",
    behaviorRules: [
      "Lead with conversation",
      "Never bribe when charm works",
    ],
  },
  {
    id: "ink-precise",
    name: "Ink Precise",
    personality:
      "Obsessed with clean paper trails. Hates loose ink and louder exits.",
    behaviorRules: [
      "Leave no ink trail",
      "Never reuse a plate or stamp",
    ],
  },
  {
    id: "long-watch",
    name: "Long Watch",
    personality:
      "Patience as a weapon. Watches patterns until the pattern closes.",
    behaviorRules: [
      "Watch before approach",
      "Do not break cover for curiosity",
    ],
  },
  {
    id: "ghost-step",
    name: "Ghost Step",
    personality:
      "Empty coat energy. Prefers roofs, alleys, and exits nobody saw.",
    behaviorRules: [
      "Prefer silent exits",
      "Avoid open confrontation",
    ],
  },
  {
    id: "hard-line",
    name: "Hard Line",
    personality:
      "Discipline first. Will not bend rules that keep the desk clean.",
    behaviorRules: [
      "Follow the brief exactly",
      "No freelancing mid-mission",
    ],
  },
  {
    id: "soft-handler",
    name: "Soft Handler",
    personality:
      "Manages people, not locks. Soft voice, hard boundaries for assets.",
    behaviorRules: [
      "Protect cover identities",
      "Never burn an asset casually",
    ],
  },
  {
    id: "tech-shadow",
    name: "Tech Shadow",
    personality:
      "Trusts tools more than talk. Quiet with cables, loud only in logs.",
    behaviorRules: [
      "Prefer tech over muscle",
      "Wipe traces before exfil",
    ],
  },
];

export function getPersonalityPreset(
  id: string,
): PersonalityPreset | undefined {
  return PERSONALITY_PRESETS.find((p) => p.id === id);
}

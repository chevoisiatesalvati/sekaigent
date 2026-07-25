import type { CaseDocument } from "@sekaigent/game-schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Practice mocks / local desk. Off by default for live-first. */
export const USE_MOCKS =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ||
  process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export type MissionListItem = {
  id: string;
  on_chain_id?: string | number | null;
  region_id: string;
  title: string;
  public_brief: string;
  duration: string;
  status: string;
  entry_fee_wei: string;
  prize_pool_wei?: string;
  ends_at: string;
  starts_at?: string;
  max_entrants?: number;
  case_file?: CaseDocument[];
  solution_notes?: string;
  hidden_criteria?: string;
};

/** Prefer numeric vault id for chain accept/submit and playHash. */
export function missionChainId(mission: MissionListItem): string | null {
  if (mission.on_chain_id != null && String(mission.on_chain_id) !== "") {
    return String(mission.on_chain_id);
  }
  if (/^\d+$/.test(mission.id)) return mission.id;
  return null;
}

export type MissionAudit = {
  missionId?: string;
  rankings?: Array<{
    rank: number;
    agentTokenId: string;
    total: number;
    reasoning: string;
    scores?: Record<string, number>;
  }>;
  revealedCriteria?: string;
  solutionNotes?: string;
  evaluation?: {
    scores?: Record<string, number>;
    total?: number;
  };
};

export async function fetchMissions(): Promise<MissionListItem[]> {
  try {
    const res = await fetch(`${API_URL}/missions`, { cache: "no-store" });
    if (!res.ok) return USE_MOCKS ? MOCK_MISSIONS : [];
    const rows = (await res.json()) as MissionListItem[];
    if (rows.length > 0) return rows;
    return USE_MOCKS ? MOCK_MISSIONS : [];
  } catch {
    return USE_MOCKS ? MOCK_MISSIONS : [];
  }
}

export async function fetchMission(
  id: string,
): Promise<MissionListItem | null> {
  const mock = USE_MOCKS
    ? (MOCK_MISSIONS.find((m) => m.id === id) ?? null)
    : null;
  try {
    const res = await fetch(`${API_URL}/missions/${id}`, { cache: "no-store" });
    if (!res.ok) return mock;
    const row = (await res.json()) as MissionListItem;
    return {
      ...row,
      case_file: row.case_file ?? mock?.case_file,
    };
  } catch {
    return mock;
  }
}

export async function fetchMissionAudit(
  id: string,
): Promise<MissionAudit | null> {
  try {
    const res = await fetch(`${API_URL}/missions/${id}/audit`, {
      cache: "no-store",
    });
    if (!res.ok) return USE_MOCKS ? (MOCK_AUDITS[id] ?? null) : null;
    return (await res.json()) as MissionAudit;
  } catch {
    return USE_MOCKS ? (MOCK_AUDITS[id] ?? null) : null;
  }
}

export async function fetchOwnedAgents(address: string): Promise<
  Array<{ tokenId: string; encryptedURI: string; metadataHash: string }>
> {
  try {
    const res = await fetch(
      `${API_URL}/agents/owned?address=${encodeURIComponent(address)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as {
      agents?: Array<{
        tokenId: string;
        encryptedURI: string;
        metadataHash: string;
      }>;
    };
    return body.agents ?? [];
  } catch {
    return [];
  }
}

export async function sealAgentIntel(intel: unknown): Promise<{
  rootHash: string;
  backend?: string;
} | null> {
  try {
    const res = await fetch(`${API_URL}/storage/seal-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intel }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { rootHash: string; backend?: string };
  } catch {
    return null;
  }
}

export async function sealPlayToStorage(play: unknown): Promise<{
  rootHash: string;
  backend?: string;
} | null> {
  try {
    const res = await fetch(`${API_URL}/storage/seal-play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ play }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { rootHash: string; backend?: string };
  } catch {
    return null;
  }
}

export async function recordPlayStorage(input: {
  missionId: string;
  agentTokenId: string;
  playHash: string;
  storageUri: string;
  sealedJson?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_URL}/missions/${encodeURIComponent(input.missionId)}/plays`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentTokenId: input.agentTokenId,
          playHash: input.playHash,
          storageUri: input.storageUri,
          sealedJson: input.sealedJson,
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export type FieldDeploymentRow = {
  missionId: string;
  missionTitle: string;
  onChainId: string | null;
  status: string;
  agentTokenId: string;
  playHash: string | null;
  playerAddress: string | null;
};

export async function fetchFieldDeployments(
  address: string,
): Promise<FieldDeploymentRow[]> {
  try {
    const res = await fetch(
      `${API_URL}/field?address=${encodeURIComponent(address)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { deployments?: FieldDeploymentRow[] };
    return body.deployments ?? [];
  } catch {
    return [];
  }
}

export type CreateMissionPayload = {
  regionId: string;
  title: string;
  publicBrief: string;
  caseFile: CaseDocument[];
  duration: "daily" | "weekly" | "monthly";
  startsAt: string;
  endsAt: string;
  entryFeeWei: string;
  maxEntrants: number;
  hiddenCriteria: string;
  solutionNotes?: string;
  salt: string;
};

export async function createMissionAdmin(
  token: string,
  payload: CreateMissionPayload,
): Promise<unknown> {
  const res = await fetch(`${API_URL}/missions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export type SuggestOrdersPayload = {
  missionId: string;
  agentTokenId: string;
  publicBrief: string;
  caseLeads: Array<{ id: string; title: string; excerpt: string }>;
  styleId: string;
  fallbackId: string;
  commanderNote?: string;
  agentIntel: {
    personality: string;
    skills: Record<string, number>;
    behaviorRules: string[];
    memoryDigest: string;
  };
  wordBudgetMax: number;
};

export type SuggestOrdersResponse = {
  play: {
    approach: string;
    steps: Array<{ action: string; detail: string }>;
    risksAccepted: string[];
    resourcesUsed: string[];
    contingencies: string[];
    finalOutcomeClaim: string;
    missionId?: string;
    agentTokenId?: string;
    playHash?: string;
    submittedAt?: number;
  };
  source: "compute" | "offline";
};

export async function suggestOrders(
  payload: SuggestOrdersPayload,
): Promise<SuggestOrdersResponse | null> {
  try {
    const res = await fetch(`${API_URL}/play/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as SuggestOrdersResponse;
  } catch {
    return null;
  }
}

const HARBOR_CASE: CaseDocument[] = [
  {
    id: "h1",
    kind: "cable",
    title: "Night shift rota — Pier 7",
    body: "Clerk Voss clocks out at 01:10. Relief arrives 01:25. Manifests leave the cage only between those fifteen minutes when the seal book sits open on the counter.",
  },
  {
    id: "h2",
    kind: "rumor",
    title: "Dockside talk",
    body: "Someone claims the crate labels are painted over with fish oil brands. Half the pier believes it; the other half laughs. No one has checked under the oil.",
  },
  {
    id: "h3",
    kind: "ledger",
    title: "Wharfinger ledger (partial)",
    body: "Row 41B: 'dry goods / sealed / do not bribe gate'. Row 41C scratched out. A tip jar by the gate has three fresh coins — likely a red herring for anyone watching money instead of paper.",
  },
  {
    id: "h4",
    kind: "witness",
    title: "Watchman statement",
    body: "Saw a courier with a stamped envelope at 00:40 near the crane. Courier whistled. Watchman looked away. Envelope was empty when recovered later — decoy.",
  },
  {
    id: "h5",
    kind: "clipping",
    title: "Harbor Gazette scrap",
    body: "City council promises 'transparent shipping'. Article mentions bribes as 'local custom'. Irrelevant to tonight's cage; written three weeks ago.",
  },
  {
    id: "h6",
    kind: "photo_note",
    title: "Sketch: cage lock",
    body: "Padlock faces the water. Shadow from the crane arm covers the keyhole from 00:55 to 01:20. Stealth path exists if you stay in that shadow — no need for force.",
  },
];

const EMBASSY_CASE: CaseDocument[] = [
  {
    id: "e1",
    kind: "cable",
    title: "Security detail brief",
    body: "Ambassador's courier rotates every forty minutes through the east gallery. Detail will escalate if any guest names the ambassador aloud in the foyer.",
  },
  {
    id: "e2",
    kind: "witness",
    title: "Coat check attendant",
    body: "Grey overcoat with a torn lining always returns at :15 past. Owner never tips. Attendant thinks they are staff. Torn lining hides a paper slip with a room number — signal.",
  },
  {
    id: "e3",
    kind: "rumor",
    title: "Garden party gossip",
    body: "Someone will 'dance with the ambassador's niece' as a password. That password was retired last month. Using it marks you as amateur.",
  },
  {
    id: "e4",
    kind: "ledger",
    title: "Visitor book (page 12)",
    body: "Three 'journalists' signed in after noon. Two left. One remains in the reading room with a camera that has no film — theatre, not tradecraft.",
  },
  {
    id: "e5",
    kind: "clipping",
    title: "Society column",
    body: "Champagne shortages at Neutral Embassy. Entirely irrelevant. Printed to fill space.",
  },
];

const ARCHIVE_CASE: CaseDocument[] = [
  {
    id: "a1",
    kind: "ledger",
    title: "Ash wing index",
    body: "Shelf R-9 holds redacted ledgers. Night clerk walks R-aisle at :00 and :30. Between passes the aisle is empty for twelve minutes.",
  },
  {
    id: "a2",
    kind: "cable",
    title: "Internal memo",
    body: "Do not remove pages without the ash stamp. Forensic dust on R-9 pages will mark gloves. Bring cotton, not leather.",
  },
  {
    id: "a3",
    kind: "rumor",
    title: "Stack whisper",
    body: "A ghost in the west stacks steals ink. West stacks are sealed tonight — ignore.",
  },
  {
    id: "a4",
    kind: "photo_note",
    title: "Shelf sketch",
    body: "R-9 third binder from left has a bent corner. That binder holds the page. Force will tear the corner and leave a story.",
  },
];

export const MOCK_MISSIONS: MissionListItem[] = [
  {
    id: "mock-harbor",
    region_id: "harbor",
    title: "Harbor Manifest",
    public_brief:
      "Recover Pier 7’s shipment manifest tonight — without raising alarms.",
    duration: "daily",
    status: "open",
    entry_fee_wei: "1000000000000000",
    prize_pool_wei: "0",
    ends_at: new Date(Date.now() + 86400000).toISOString(),
    case_file: HARBOR_CASE,
    hidden_criteria:
      "no bribes; stealth only; prefer night shift gap 01:10–01:25; use crane shadow",
    solution_notes:
      "Signal: night gap + crane shadow. Noise: fish oil rumor, tip jar, empty decoy envelope, old gazette.",
  },
  {
    id: "mock-embassy",
    region_id: "embassy",
    title: "Embassy Shadow",
    public_brief:
      "Identify the Neutral Embassy courier without tipping the security detail.",
    duration: "weekly",
    status: "open",
    entry_fee_wei: "2000000000000000",
    prize_pool_wei: "0",
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    case_file: EMBASSY_CASE,
    hidden_criteria:
      "do not alert the ambassador; use coat-check slip; ignore retired password",
    solution_notes:
      "Signal: torn lining / room slip. Noise: retired dance password, empty-camera journalist, champagne column.",
  },
  {
    id: "mock-archive",
    region_id: "archive",
    title: "Ash Ledger",
    public_brief:
      "Lift the redacted ledger page from the archive before the night clerk returns.",
    duration: "daily",
    status: "settled",
    entry_fee_wei: "1000000000000000",
    prize_pool_wei: "3000000000000000",
    ends_at: new Date(Date.now() - 86400000).toISOString(),
    case_file: ARCHIVE_CASE,
    hidden_criteria: "leave no forensic trace; cotton gloves; R-9 bent binder",
    solution_notes:
      "Signal: R-9 timing + cotton. Noise: west-stack ghost rumor.",
  },
];

export const MOCK_AUDITS: Record<string, MissionAudit> = {
  "mock-archive": {
    missionId: "mock-archive",
    revealedCriteria:
      "leave no forensic trace; cotton gloves; R-9 bent binder",
    solutionNotes:
      "Signal: R-9 timing + cotton. Noise: west-stack ghost rumor.",
    rankings: [
      {
        rank: 1,
        agentTokenId: "1",
        total: 83,
        reasoning:
          "Orders respected the aisle gap and avoided forensic dust; character held.",
        scores: {
          objectiveFit: 26,
          constraintCompliance: 22,
          tradecraftQuality: 20,
          characterConsistency: 15,
        },
      },
    ],
  },
};

export const REGIONS = [
  { id: "harbor", name: "Iron Harbor", x: 22, y: 58 },
  { id: "embassy", name: "Neutral Embassy", x: 48, y: 32 },
  { id: "archive", name: "Ash Archive", x: 72, y: 46 },
  { id: "station", name: "Relay Station", x: 38, y: 72 },
] as const;

export function regionName(regionId: string): string {
  return REGIONS.find((r) => r.id === regionId)?.name ?? regionId;
}

export { API_URL };

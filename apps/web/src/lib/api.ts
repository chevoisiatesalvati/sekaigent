const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type MissionListItem = {
  id: string;
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
};

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
  evaluation?: {
    scores?: Record<string, number>;
    total?: number;
  };
};

export async function fetchMissions(): Promise<MissionListItem[]> {
  try {
    const res = await fetch(`${API_URL}/missions`, { cache: "no-store" });
    if (!res.ok) return MOCK_MISSIONS;
    return (await res.json()) as MissionListItem[];
  } catch {
    return MOCK_MISSIONS;
  }
}

export async function fetchMission(
  id: string,
): Promise<MissionListItem | null> {
  try {
    const res = await fetch(`${API_URL}/missions/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as MissionListItem;
  } catch {
    return null;
  }
}

export async function fetchMissionAudit(
  id: string,
): Promise<MissionAudit | null> {
  try {
    const res = await fetch(`${API_URL}/missions/${id}/audit`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MissionAudit;
  } catch {
    return null;
  }
}

export const MOCK_MISSIONS: MissionListItem[] = [
  {
    id: "mock-harbor",
    region_id: "harbor",
    title: "Harbor Manifest",
    public_brief: "Recover the shipment manifest without raising alarms.",
    duration: "daily",
    status: "open",
    entry_fee_wei: "1000000000000000",
    prize_pool_wei: "0",
    ends_at: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: "mock-embassy",
    region_id: "embassy",
    title: "Embassy Shadow",
    public_brief: "Identify the courier without tipping the security detail.",
    duration: "weekly",
    status: "open",
    entry_fee_wei: "2000000000000000",
    prize_pool_wei: "0",
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
  {
    id: "mock-archive",
    region_id: "archive",
    title: "Ash Ledger",
    public_brief: "Lift the redacted ledger page before the night clerk returns.",
    duration: "daily",
    status: "settled",
    entry_fee_wei: "1000000000000000",
    prize_pool_wei: "3000000000000000",
    ends_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const REGIONS = [
  {
    id: "harbor",
    name: "Iron Harbor",
    x: 22,
    y: 58,
  },
  {
    id: "embassy",
    name: "Neutral Embassy",
    x: 48,
    y: 32,
  },
  {
    id: "archive",
    name: "Ash Archive",
    x: 72,
    y: 46,
  },
  {
    id: "station",
    name: "Relay Station",
    x: 38,
    y: 72,
  },
] as const;

export function regionName(regionId: string): string {
  return REGIONS.find((r) => r.id === regionId)?.name ?? regionId;
}

export { API_URL };

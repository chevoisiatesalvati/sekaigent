const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type MissionListItem = {
  id: string;
  region_id: string;
  title: string;
  public_brief: string;
  duration: string;
  status: string;
  entry_fee_wei: string;
  ends_at: string;
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

export const MOCK_MISSIONS: MissionListItem[] = [
  {
    id: "mock-harbor",
    region_id: "harbor",
    title: "Harbor Manifest",
    public_brief: "Recover the shipment manifest without raising alarms.",
    duration: "daily",
    status: "open",
    entry_fee_wei: "1000000000000000",
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
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
];

export const REGIONS = [
  { id: "harbor", name: "Iron Harbor", x: 22, y: 58 },
  { id: "embassy", name: "Neutral Embassy", x: 48, y: 32 },
  { id: "archive", name: "Ash Archive", x: 72, y: 46 },
  { id: "station", name: "Relay Station", x: 38, y: 72 },
] as const;

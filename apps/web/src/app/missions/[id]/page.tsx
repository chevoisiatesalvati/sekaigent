import Link from "next/link";
import { MissionBriefing } from "./MissionBriefing";
import { API_URL, fetchMission, fetchMissionAudit } from "@/lib/api";

export default async function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = await fetchMission(id);
  if (!mission) {
    return (
      <main className="stack">
        <h1>Mission not found</h1>
        <p className="muted">Is the ops desk API running on {API_URL}?</p>
        <Link className="btn secondary" href="/missions">
          Back to board
        </Link>
      </main>
    );
  }

  const settled = mission.status === "settled";
  const audit = settled ? await fetchMissionAudit(id) : null;

  return <MissionBriefing mission={mission} audit={audit} />;
}

import { AcceptMissionButton } from "./AcceptMissionButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Mission = {
  id: string;
  region_id: string;
  title: string;
  public_brief: string;
  duration: string;
  status: string;
  entry_fee_wei: string;
  ends_at: string;
};

type Audit = {
  rankings?: Array<{
    rank: number;
    agentTokenId: string;
    total: number;
    reasoning: string;
  }>;
  revealedCriteria?: string;
};

async function loadMission(id: string): Promise<Mission | null> {
  try {
    const res = await fetch(`${API_URL}/missions/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Mission;
  } catch {
    return null;
  }
}

async function loadAudit(id: string): Promise<Audit | null> {
  try {
    const res = await fetch(`${API_URL}/missions/${id}/audit`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Audit;
  } catch {
    return null;
  }
}

export default async function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = await loadMission(id);
  if (!mission) {
    return (
      <main>
        <h1>Mission not found</h1>
        <p className="muted">Is the API running on {API_URL}?</p>
      </main>
    );
  }

  const settled = mission.status === "settled";
  const audit = settled ? await loadAudit(id) : null;

  return (
    <main className="stack">
      <div>
        <p className="muted">
          {mission.region_id} · {mission.duration}
        </p>
        <h1>{mission.title}</h1>
        <p>{mission.public_brief}</p>
      </div>
      <div className="panel stack">
        <p>
          Entry fee: {mission.entry_fee_wei} wei · Status:{" "}
          <strong>{mission.status}</strong>
        </p>
        <p className="muted">
          Ends {new Date(mission.ends_at).toLocaleString()}
        </p>
        {!settled && <AcceptMissionButton missionId={mission.id} />}
      </div>
      {settled && audit?.rankings && (
        <section className="panel">
          <h2>Rankings & public audit</h2>
          {audit.revealedCriteria && (
            <p className="muted">
              Revealed criteria: {audit.revealedCriteria}
            </p>
          )}
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Agent</th>
                <th>Score</th>
                <th>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {audit.rankings.map((row) => (
                <tr key={row.agentTokenId}>
                  <td>{row.rank}</td>
                  <td>#{row.agentTokenId}</td>
                  <td>{row.total}</td>
                  <td>{row.reasoning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {!settled && (
        <p className="muted">
          Reasonings stay sealed until the mission settles — then the full audit
          is public.
        </p>
      )}
    </main>
  );
}

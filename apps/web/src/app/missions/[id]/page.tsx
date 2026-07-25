import { MOCK_MISSIONS, fetchMissions } from "@/lib/api";
import { AcceptMissionButton } from "./AcceptMissionButton";

const MOCK_RANKINGS = [
  {
    rank: 1,
    agentTokenId: "1",
    total: 84,
    reasoning:
      "Strong cover and stealth contingencies; respected no-bribe constraint.",
  },
  {
    rank: 2,
    agentTokenId: "4",
    total: 71,
    reasoning: "Solid tradecraft; weaker character consistency on forgery claim.",
  },
];

export default async function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const missions = await fetchMissions();
  const mission =
    missions.find((m) => m.id === id) ??
    MOCK_MISSIONS.find((m) => m.id === id) ??
    MOCK_MISSIONS[0];

  const settled = mission.status === "settled";

  return (
    <main className="stack">
      <div>
        <p className="muted">{mission.region_id} · {mission.duration}</p>
        <h1>{mission.title}</h1>
        <p>{mission.public_brief}</p>
      </div>
      <div className="panel stack">
        <p>
          Entry fee: {mission.entry_fee_wei} wei · Status:{" "}
          <strong>{mission.status}</strong>
        </p>
        <p className="muted">Ends {new Date(mission.ends_at).toLocaleString()}</p>
        {!settled && <AcceptMissionButton missionId={mission.id} />}
      </div>
      {settled && (
        <section className="panel">
          <h2>Rankings</h2>
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
              {MOCK_RANKINGS.map((row) => (
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

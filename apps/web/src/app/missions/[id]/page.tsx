import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import {
  API_URL,
  fetchMission,
  fetchMissionAudit,
  regionName,
} from "@/lib/api";
import {
  COPY,
  durationLabel,
  regionLore,
  RUBRIC_LABELS,
  type RubricKey,
} from "@/lib/copy";
import { formatCountdown, formatOgFromWei, formatPercent } from "@/lib/format";

const RUBRIC_MAX: Record<RubricKey, number> = {
  objectiveFit: 30,
  constraintCompliance: 25,
  tradecraftQuality: 25,
  characterConsistency: 20,
};

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
  const open = mission.status === "open";
  const audit = settled ? await fetchMissionAudit(id) : null;
  const purse = mission.prize_pool_wei ?? mission.entry_fee_wei;
  const scores = audit?.rankings?.[0]?.scores ?? audit?.evaluation?.scores;

  return (
    <main className="stack">
      <div className="page-head">
        <div>
          <p className="muted" style={{ margin: 0 }}>
            {regionName(mission.region_id)} · {durationLabel(mission.duration)}
          </p>
          <h1 style={{ margin: "0.25rem 0" }}>
            {settled ? COPY.debriefTitle : COPY.briefingTitle}: {mission.title}
          </h1>
          <p style={{ margin: 0 }}>{mission.public_brief}</p>
        </div>
        <StatusChip status={mission.status} />
      </div>

      <p className="muted">{regionLore(mission.region_id)}</p>

      <div className="metric-row">
        <div className="metric">
          <span className="label">{COPY.entryStake}</span>
          <strong>{formatOgFromWei(mission.entry_fee_wei)}</strong>
        </div>
        <div className="metric">
          <span className="label">{COPY.purse}</span>
          <strong>{formatOgFromWei(purse)}</strong>
        </div>
        <div className="metric">
          <span className="label">{COPY.window}</span>
          <strong>{formatCountdown(mission.ends_at)}</strong>
        </div>
        <div className="metric">
          <span className="label">{COPY.fieldStatus}</span>
          <strong>{settled ? "Debrief complete" : open ? "Accepting" : "Sealed"}</strong>
        </div>
      </div>

      {open && (
        <section className="panel stack">
          <p className="muted" style={{ margin: 0 }}>
            {COPY.classifiedSealed}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {COPY.fieldPlanSealed}
          </p>
          <Link className="btn signal" href={`#deploy`}>
            {COPY.deployCta}
          </Link>
          <div id="deploy" />
        </section>
      )}

      {settled && audit?.rankings && (
        <section className="panel stack">
          <h2>Final standings</h2>
          {audit.revealedCriteria && (
            <p className="muted">
              Classified briefing revealed: {audit.revealedCriteria}
            </p>
          )}
          {scores && (
            <div className="stack" style={{ gap: "0.45rem" }}>
              {(Object.keys(RUBRIC_LABELS) as RubricKey[]).map((key) => {
                const value = Number(scores[key] ?? 0);
                const max = RUBRIC_MAX[key];
                return (
                  <div key={key} className="tradecraft-meter">
                    <span>{RUBRIC_LABELS[key]}</span>
                    <div className="track" aria-hidden>
                      <div
                        className="fill"
                        style={{ width: `${formatPercent(value, max)}%` }}
                      />
                    </div>
                    <span>
                      {value}/{max}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Operative</th>
                <th>Score</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {audit.rankings.map((row) => (
                <tr key={row.agentTokenId}>
                  <td>{row.rank}</td>
                  <td>Unknown operative #{row.agentTokenId}</td>
                  <td>{row.total}</td>
                  <td>{row.reasoning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!settled && !open && (
        <p className="muted">
          Field reports stay sealed until debrief — then standings go public.
        </p>
      )}

      <Link className="btn secondary" href="/missions">
        Back to board
      </Link>
    </main>
  );
}

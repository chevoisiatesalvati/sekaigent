import Link from "next/link";
import { DeployTheater } from "@/components/DeployTheater";
import { StatusChip } from "@/components/StatusChip";
import type { MissionAudit, MissionListItem } from "@/lib/api";
import { regionName } from "@/lib/api";
import {
  COPY,
  durationLabel,
  regionLore,
  RUBRIC_LABELS,
  type RubricKey,
} from "@/lib/copy";
import { formatCountdown, formatOgFromWei, formatPercent } from "@/lib/format";
import { DebriefRankings } from "@/components/DebriefRankings";

const RUBRIC_MAX: Record<RubricKey, number> = {
  objectiveFit: 30,
  constraintCompliance: 25,
  tradecraftQuality: 25,
  characterConsistency: 20,
};

export function MissionBriefing({
  mission,
  audit,
}: {
  mission: MissionListItem;
  audit: MissionAudit | null;
}) {
  const settled = mission.status === "settled";
  const open = mission.status === "open";
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
          <strong>
            {settled ? "Debrief complete" : open ? "Accepting" : "Sealed"}
          </strong>
        </div>
      </div>

      {open && (
        <>
          <section className="panel stack">
            <p className="muted" style={{ margin: 0 }}>
              {COPY.classifiedSealed}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {COPY.fieldPlanSealed}
            </p>
          </section>
          <DeployTheater
            missionId={mission.id}
            entryFeeWei={mission.entry_fee_wei}
            missionTitle={mission.title}
          />
        </>
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
          <DebriefRankings rankings={audit.rankings} />
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

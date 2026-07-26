"use client";

import { useEffect, useState } from "react";
import { RUBRIC_MAX } from "@sekaigent/game-schemas";
import {
  fetchMission,
  fetchMissionAudit,
  regionName,
  type MissionAudit,
  type MissionListItem,
} from "@/lib/api";
import { COPY, RUBRIC_LABELS, statusLabel, type RubricKey } from "@/lib/copy";
import { useUiStore } from "../stores/uiStore";
import { useFieldStore } from "../stores/fieldStore";
import { resolveOperativeLabel } from "../components/resolveOperative";

export function DebriefScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const setScreen = useUiStore((s) => s.setScreen);
  const markDebriefed = useFieldStore((s) => s.markDebriefed);

  const [mission, setMission] = useState<MissionListItem | null>(null);
  const [audit, setAudit] = useState<MissionAudit | null>(null);

  useEffect(() => {
    if (!missionId) return;
    setMission(null);
    setAudit(null);
    let cancelled = false;
    Promise.all([fetchMission(missionId), fetchMissionAudit(missionId)]).then(
      ([m, a]) => {
        if (cancelled) return;
        if (m) setMission(m);
        if (a) setAudit(a);
      },
    );
    markDebriefed(missionId);
    return () => {
      cancelled = true;
    };
  }, [missionId, markDebriefed]);

  if (!missionId) {
    return (
      <div className="screen-pad">
        <p className="empty-note">No debrief selected.</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setScreen("map")}
        >
          Cases
        </button>
      </div>
    );
  }

  const rankings = audit?.rankings ?? [];
  const solution =
    audit?.solutionNotes ?? mission?.solution_notes ?? null;
  const anyOffline = rankings.some((r) => r.evalSource === "offline");

  return (
    <div className="screen-scroll">
      <button
        type="button"
        className="btn ghost"
        onClick={() => setScreen("map")}
      >
        ← Cases
      </button>
      <h2 className="panel-title" style={{ marginTop: "0.5rem" }}>
        {COPY.debriefTitle}
      </h2>
      <p className="panel-sub">
        {mission?.title ?? missionId}
        {mission ? ` · ${regionName(mission.region_id)}` : ""}
        {mission ? ` · ${statusLabel(mission.status)}` : ""}
      </p>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="panel-title">Revealed criteria</h3>
        <p>
          {audit?.revealedCriteria ??
            mission?.hidden_criteria ??
            "Criteria still sealed or unavailable."}
        </p>
      </div>

      {solution && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h3 className="panel-title">Case solution</h3>
          <p>{solution}</p>
        </div>
      )}

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="panel-title">Standings</h3>
        {rankings.length === 0 ? (
          <p className="empty-note">
            No public rankings yet. Settled cases show rubric totals here.
          </p>
        ) : (
          <ol className="debrief-podium">
            {rankings.map((row) => (
              <li key={`stand-${row.rank}-${row.agentTokenId}`}>
                <span className="debrief-rank">#{row.rank}</span>
                <strong>{resolveOperativeLabel(row.agentTokenId)}</strong>
                <span className="debrief-total">{row.total}/100</span>
              </li>
            ))}
          </ol>
        )}
        {anyOffline && (
          <p className="empty-note" style={{ marginTop: "0.65rem" }}>
            Graded with the desk rubric (live Router unavailable). New cases
            after the seed fix use 0G Compute when the key is set.
          </p>
        )}
      </div>

      <div className="panel">
        <h3 className="panel-title">Evaluation dossiers</h3>
        <p className="panel-sub" style={{ marginBottom: "0.85rem" }}>
          How each operative was scored against the revealed criteria (100 pts:
          objective 30 · constraints 25 · tradecraft 25 · character 20).
        </p>
        {rankings.length === 0 ? (
          <p className="empty-note">No evaluations posted yet.</p>
        ) : (
          <div className="debrief-eval-list">
            {rankings.map((row) => (
              <article
                key={`eval-${row.agentTokenId}`}
                className="debrief-eval-card"
              >
                <header className="debrief-eval-head">
                  <div>
                    <span className="debrief-rank">#{row.rank}</span>{" "}
                    <strong>{resolveOperativeLabel(row.agentTokenId)}</strong>
                  </div>
                  <div className="debrief-eval-meta">
                    <span className="chip">
                      Total <strong>{row.total}</strong>
                    </span>
                    <span
                      className={`chip ${
                        row.evalSource === "compute" ? "open" : "settled"
                      }`}
                    >
                      {row.evalSource === "compute"
                        ? "0G Compute"
                        : "Desk rubric"}
                    </span>
                  </div>
                </header>
                <ul className="debrief-rubric">
                  {(Object.keys(RUBRIC_LABELS) as RubricKey[]).map((key) => {
                    const score = row.scores?.[key] ?? 0;
                    const max = RUBRIC_MAX[key];
                    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
                    return (
                      <li key={key}>
                        <div className="debrief-rubric-label">
                          <span>{RUBRIC_LABELS[key]}</span>
                          <span>
                            {score}/{max}
                          </span>
                        </div>
                        <div
                          className="debrief-rubric-track"
                          aria-hidden
                        >
                          <div
                            className="debrief-rubric-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="debrief-reasoning">{row.reasoning}</p>
                {(row.modelId || row.promptVersion) && (
                  <p className="empty-note">
                    {[row.promptVersion, row.modelId]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

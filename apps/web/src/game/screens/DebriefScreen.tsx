"use client";

import { useEffect, useState } from "react";
import {
  fetchMission,
  fetchMissionAudit,
  MOCK_MISSIONS,
  regionName,
  type MissionAudit,
  type MissionListItem,
} from "@/lib/api";
import { COPY, RUBRIC_LABELS, statusLabel, type RubricKey } from "@/lib/copy";
import { useUiStore } from "../stores/uiStore";
import { useFieldStore } from "../stores/fieldStore";
import { resolveOperativeLabel } from "../components/resolveOperative";

const MOCK_AUDIT: MissionAudit = {
  missionId: "mock-archive",
  revealedCriteria: "Recover ledger without bribes or open violence.",
  rankings: [
    {
      rank: 1,
      agentTokenId: "1",
      total: 83,
      reasoning:
        "Clean infiltration path; restraint held; criteria fit strong.",
      scores: {
        objectiveFit: 26,
        constraintCompliance: 22,
        tradecraftQuality: 20,
        characterConsistency: 15,
      },
    },
  ],
};

export function DebriefScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const setScreen = useUiStore((s) => s.setScreen);
  const markDebriefed = useFieldStore((s) => s.markDebriefed);

  const [mission, setMission] = useState<MissionListItem | null>(null);
  const [audit, setAudit] = useState<MissionAudit | null>(null);

  useEffect(() => {
    if (!missionId) return;
    const mock = MOCK_MISSIONS.find((m) => m.id === missionId) ?? null;
    setMission(mock);
    setAudit(
      missionId === "mock-archive" || missionId.startsWith("mock-")
        ? { ...MOCK_AUDIT, missionId }
        : null,
    );
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
          Map
        </button>
      </div>
    );
  }

  const rankings = audit?.rankings ?? [];

  return (
    <div className="screen-scroll">
      <button
        type="button"
        className="btn ghost"
        onClick={() => setScreen("map")}
      >
        ← Map
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
            "Criteria still sealed or unavailable from API."}
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-title">Rankings</h3>
        {rankings.length === 0 ? (
          <p className="empty-note">
            No public rankings yet. Settled missions will show rubric totals
            here.
          </p>
        ) : (
          <table className="rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Operative</th>
                <th>Total</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((row) => (
                <tr key={`${row.rank}-${row.agentTokenId}`}>
                  <td>{row.rank}</td>
                  <td>{resolveOperativeLabel(row.agentTokenId)}</td>
                  <td>{row.total}</td>
                  <td>
                    <div>{row.reasoning}</div>
                    {row.scores && (
                      <div className="chip-row" style={{ marginTop: "0.35rem" }}>
                        {(Object.keys(RUBRIC_LABELS) as RubricKey[]).map(
                          (key) =>
                            row.scores?.[key] != null ? (
                              <span className="chip" key={key}>
                                {RUBRIC_LABELS[key]}{" "}
                                <strong>{row.scores[key]}</strong>
                              </span>
                            ) : null,
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  fetchMissions,
  MOCK_MISSIONS,
  REGIONS,
  regionName,
  type MissionListItem,
} from "@/lib/api";
import { COPY, regionLore, statusLabel } from "@/lib/copy";
import { useUiStore } from "../stores/uiStore";
import { useSquadStore } from "../stores/squadStore";

const WorldStage = dynamic(
  () => import("../three/WorldStage").then((m) => m.WorldStage),
  { ssr: false, loading: () => <div className="map-stage" /> },
);

function orderMissions(missions: MissionListItem[]): MissionListItem[] {
  const regionOrder = REGIONS.map((r) => r.id as string);
  return [...missions].sort((a, b) => {
    const ai = regionOrder.indexOf(a.region_id);
    const bi = regionOrder.indexOf(b.region_id);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}

export function MapScreen() {
  const [missions, setMissions] = useState<MissionListItem[]>(MOCK_MISSIONS);
  const openBrief = useUiStore((s) => s.openBrief);
  const openDebrief = useUiStore((s) => s.openDebrief);
  const selectMission = useUiStore((s) => s.selectMission);
  const selectedMissionId = useUiStore((s) => s.selectedMissionId);
  const setScreen = useUiStore((s) => s.setScreen);
  const agents = useSquadStore((s) => s.agents);

  useEffect(() => {
    let cancelled = false;
    fetchMissions().then((rows) => {
      if (!cancelled && rows.length > 0) setMissions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = useMemo(() => orderMissions(missions), [missions]);

  useEffect(() => {
    if (ordered.length === 0) return;
    if (
      selectedMissionId &&
      ordered.some((m) => m.id === selectedMissionId)
    ) {
      return;
    }
    const fallback =
      ordered.find((m) => m.status === "open") ?? ordered[0] ?? null;
    if (fallback) selectMission(fallback.id);
  }, [ordered, selectedMissionId, selectMission]);

  const selectedIndex = Math.max(
    0,
    ordered.findIndex((m) => m.id === selectedMissionId),
  );
  const selected = ordered[selectedIndex] ?? ordered[0] ?? null;

  const goRelative = useCallback(
    (delta: number) => {
      if (ordered.length === 0) return;
      const next =
        (selectedIndex + delta + ordered.length) % ordered.length;
      const mission = ordered[next];
      if (mission) selectMission(mission.id);
    },
    [ordered, selectedIndex, selectMission],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goRelative(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goRelative(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goRelative]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div className="map-stage">
        <WorldStage
          missions={missions}
          selectedMissionId={selected?.id ?? null}
          onSelectMission={(id) => selectMission(id)}
        />
      </div>
      <div className="map-overlay">
        <div className="panel">
          <h2 className="panel-title">{COPY.missionsTitle}</h2>
          <p className="panel-sub" style={{ marginBottom: "0.5rem" }}>
            {COPY.mapHint}
          </p>
          {agents.length === 0 && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setScreen("squad")}
            >
              {COPY.hqCtaHire}
            </button>
          )}
        </div>
        {selected && (
          <div className="panel map-case-card">
            <button
              type="button"
              className="map-nav-chevron"
              aria-label="Previous case"
              onClick={() => goRelative(-1)}
              disabled={ordered.length < 2}
            >
              ‹
            </button>
            <div className="map-case-body">
              <div className="map-case-meta">
                <span className="map-case-index">
                  {selectedIndex + 1} / {ordered.length}
                </span>
                <span
                  className={`chip ${
                    selected.status === "open" ? "open" : "settled"
                  }`}
                >
                  {statusLabel(selected.status)}
                </span>
                <span className="chip">{regionName(selected.region_id)}</span>
              </div>
              <h3 className="map-case-title">{selected.title}</h3>
              <p className="objective-inline">
                <span className="objective-label">{COPY.objectiveLabel}</span>
                {selected.public_brief}
              </p>
              <div className="map-case-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    selected.status === "settled"
                      ? openDebrief(selected.id)
                      : openBrief(selected.id)
                  }
                >
                  {selected.status === "settled"
                    ? COPY.debriefTitle
                    : COPY.briefingTitle}
                </button>
              </div>
            </div>
            <button
              type="button"
              className="map-nav-chevron"
              aria-label="Next case"
              onClick={() => goRelative(1)}
              disabled={ordered.length < 2}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

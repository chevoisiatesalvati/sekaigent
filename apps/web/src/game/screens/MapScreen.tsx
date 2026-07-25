"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  fetchMissions,
  MOCK_MISSIONS,
  regionName,
  type MissionListItem,
} from "@/lib/api";
import { COPY, regionLore, statusLabel } from "@/lib/copy";
import { useUiStore } from "../stores/uiStore";

const WorldStage = dynamic(
  () => import("../three/WorldStage").then((m) => m.WorldStage),
  { ssr: false, loading: () => <div className="map-stage" /> },
);

export function MapScreen() {
  const [missions, setMissions] = useState<MissionListItem[]>(MOCK_MISSIONS);
  const openBrief = useUiStore((s) => s.openBrief);
  const openDebrief = useUiStore((s) => s.openDebrief);
  const selectedMissionId = useUiStore((s) => s.selectedMissionId);

  useEffect(() => {
    let cancelled = false;
    fetchMissions().then((rows) => {
      if (!cancelled && rows.length > 0) setMissions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected =
    missions.find((m) => m.id === selectedMissionId) ??
    missions.find((m) => m.status === "open") ??
    missions[0];

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div className="map-stage">
        <WorldStage
          missions={missions}
          selectedMissionId={selected?.id ?? null}
          onSelectMission={(id) => {
            const m = missions.find((row) => row.id === id);
            if (!m) return;
            if (m.status === "settled") openDebrief(id);
            else openBrief(id);
          }}
        />
      </div>
      <div className="map-overlay">
        <div className="panel">
          <h2 className="panel-title">{COPY.missionsTitle}</h2>
          <p className="panel-sub" style={{ marginBottom: "0.5rem" }}>
            Click a region pin on the globe. Open windows pulse.
          </p>
        </div>
        {selected && (
          <div className="panel">
            <div className="chip-row" style={{ marginBottom: "0.5rem" }}>
              <span
                className={`chip ${
                  selected.status === "open" ? "open" : "settled"
                }`}
              >
                {statusLabel(selected.status)}
              </span>
              <span className="chip">{regionName(selected.region_id)}</span>
            </div>
            <h3 className="panel-title">{selected.title}</h3>
            <p className="panel-sub">{regionLore(selected.region_id)}</p>
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
        )}
      </div>
    </div>
  );
}

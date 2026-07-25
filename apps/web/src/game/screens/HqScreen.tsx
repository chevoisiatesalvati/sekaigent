"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/lib/copy";
import { fetchMissions, type MissionListItem } from "@/lib/api";
import { useUiStore } from "../stores/uiStore";
import { useSquadStore } from "../stores/squadStore";
import { useFieldStore } from "../stores/fieldStore";

/** Command hub — one primary next action for the game loop. */
export function HqScreen() {
  const setScreen = useUiStore((s) => s.setScreen);
  const agents = useSquadStore((s) => s.agents);
  const deployments = useFieldStore((s) => s.deployments);
  const active = deployments.filter((d) => d.status === "in_field");
  const [openCases, setOpenCases] = useState<MissionListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchMissions().then((rows) => {
      if (!cancelled) {
        setOpenCases(rows.filter((m) => m.status === "open"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  let primaryLabel: string = COPY.hqCtaHire;
  let primaryAction = () => setScreen("recruit");
  let lead = "You need an operative before you can open a case.";

  if (agents.length === 0) {
    primaryLabel = COPY.hqCtaHire;
    primaryAction = () => setScreen("recruit");
    lead = "Hire and train an operative first. Cases come after.";
  } else if (active.length > 0) {
    primaryLabel = COPY.hqCtaField;
    primaryAction = () => setScreen("field");
    lead =
      "You have people in the field. Check deployments, then open another case.";
  } else if (openCases.length > 0) {
    primaryLabel = COPY.hqCtaCases;
    primaryAction = () => setScreen("map");
    lead = "Squad ready. Study an open case, write orders, seal.";
  } else {
    primaryLabel = COPY.hqCtaSquad;
    primaryAction = () => setScreen("squad");
    lead = "Train your squad while you wait for the next case.";
  }

  return (
    <div className="screen-pad command-pad">
      <p className="panel-sub" style={{ marginBottom: "0.35rem" }}>
        {COPY.commandTitle}
      </p>
      <h2 className="hq-title">Sekaigent</h2>
      <p className="hq-lead">{lead}</p>
      <div className="action-row">
        <button type="button" className="btn" onClick={primaryAction}>
          {primaryLabel}
        </button>
        {agents.length > 0 && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => setScreen("squad")}
          >
            {COPY.hqCtaSquad}
          </button>
        )}
        {agents.length > 0 && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => setScreen("map")}
          >
            {COPY.hqCtaCases}
          </button>
        )}
      </div>
      <p className="empty-note" style={{ marginTop: "1.5rem", maxWidth: "28rem" }}>
        {COPY.commandLead}
      </p>
    </div>
  );
}

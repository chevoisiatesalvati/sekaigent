"use client";

import { COPY } from "@/lib/copy";
import { useUiStore } from "../stores/uiStore";
import { agentPortraitSrc, useSquadStore } from "../stores/squadStore";
import { useFieldStore } from "../stores/fieldStore";
import { MOCK_MISSIONS, regionName } from "@/lib/api";

export function HqScreen() {
  const setScreen = useUiStore((s) => s.setScreen);
  const openBrief = useUiStore((s) => s.openBrief);
  const agents = useSquadStore((s) => s.agents);
  const deployments = useFieldStore((s) => s.deployments);
  const active = deployments.filter((d) => d.status === "in_field");
  const openMissions = MOCK_MISSIONS.filter((m) => m.status === "open").slice(
    0,
    2,
  );
  const spotlight = agents[0];

  return (
    <div className="screen-pad">
      <div className="hq-hero">
        <div>
          <p className="panel-sub" style={{ marginBottom: "0.35rem" }}>
            Operations desk
          </p>
          <h2 className="hq-title">Sekaigent</h2>
          <p className="hq-lead">{COPY.hqHeadline}</p>
          <div className="action-row">
            <button
              type="button"
              className="btn"
              onClick={() => setScreen("squad")}
            >
              {COPY.hqCtaSquad}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setScreen("map")}
            >
              {COPY.hqCtaMissions}
            </button>
          </div>
          <div className="panel" style={{ marginTop: "1.5rem" }}>
            <h3 className="panel-title">Open windows</h3>
            <ul className="list-quiet">
              {openMissions.map((m) => (
                <li key={m.id}>
                  <div>
                    <strong>{m.title}</strong>
                    <div className="empty-note">{regionName(m.region_id)}</div>
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => openBrief(m.id)}
                  >
                    Brief
                  </button>
                </li>
              ))}
              {openMissions.length === 0 && (
                <li className="empty-note">No open missions.</li>
              )}
            </ul>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="panel" style={{ flex: 1 }}>
            <h3 className="panel-title">Squad spotlight</h3>
            {spotlight ? (
              <>
                <img
                  src={agentPortraitSrc(spotlight)}
                  alt={spotlight.codename}
                  width={120}
                  height={120}
                  style={{
                    borderRadius: 8,
                    marginBottom: "0.75rem",
                    display: "block",
                  }}
                />
                <strong>{spotlight.codename}</strong>
                <p className="panel-sub" style={{ marginTop: "0.35rem" }}>
                  {spotlight.publicSummary}
                </p>
              </>
            ) : (
              <p className="empty-note">{COPY.squadEmpty}</p>
            )}
          </div>
          <div className="panel">
            <h3 className="panel-title">{COPY.inTheField}</h3>
            <ul className="list-quiet">
              {active.length === 0 && (
                <li className="empty-note">No active deployments.</li>
              )}
              {active.map((d) => {
                const agent = agents.find((a) => a.id === d.agentId);
                return (
                  <li key={d.missionId}>
                    <span>
                      {agent?.codename ?? "Operative"} · {d.missionId}
                    </span>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setScreen("field")}
                    >
                      Field
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/lib/copy";
import {
  fetchMissions,
  regionName,
  type MissionListItem,
} from "@/lib/api";
import { isMissionAcceptingOrders } from "@/lib/format";
import { useUiStore } from "../stores/uiStore";
import { useFieldStore } from "../stores/fieldStore";
import { agentPortraitSrc, useSquadStore } from "../stores/squadStore";
import type { FieldDeployment } from "../types";

export function FieldScreen() {
  const deployments = useFieldStore((s) => s.deployments);
  const releaseDeployment = useFieldStore((s) => s.releaseDeployment);
  const agents = useSquadStore((s) => s.agents);
  const openBrief = useUiStore((s) => s.openBrief);
  const openDebrief = useUiStore((s) => s.openDebrief);
  const setScreen = useUiStore((s) => s.setScreen);
  const [missions, setMissions] = useState<MissionListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchMissions().then((rows) => {
      if (!cancelled) setMissions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = deployments.filter((d) => d.status === "in_field");
  const past = deployments.filter((d) => d.status === "debriefed");

  function titleFor(missionId: string): MissionListItem | undefined {
    return (
      missions.find((m) => m.id === missionId) ??
      missions.find((m) => String(m.on_chain_id) === missionId)
    );
  }

  /** Desk-only / failed seals can return; on-chain plays on still-open cases cannot. */
  function canReturnToSquad(d: FieldDeployment): boolean {
    if (d.chainError) return true;
    const mission = titleFor(d.missionId);
    if (!mission) return true;
    if (!isMissionAcceptingOrders(mission)) return true;
    const committedOnChain = Boolean(
      d.playHash || d.acceptTxHash || d.submitTxHash,
    );
    return !committedOnChain;
  }

  return (
    <div className="screen-scroll">
      <h2 className="panel-title">{COPY.fieldStatus}</h2>
      <p className="panel-sub">
        Sealed orders waiting on debrief. Chain receipts show when a live
        mission id and dossier were used.
      </p>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="panel-title">{COPY.inTheField}</h3>
        <ul className="list-quiet">
          {active.length === 0 && (
            <li className="empty-note">No active deployments.</li>
          )}
          {active.map((d) => {
            const agent = agents.find((a) => a.id === d.agentId);
            const mission = titleFor(d.missionId);
            return (
              <li key={`${d.missionId}-${d.agentId}`}>
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  {agent && (
                    <img
                      src={agentPortraitSrc(agent)}
                      alt=""
                      width={40}
                      height={40}
                      style={{ borderRadius: 6 }}
                    />
                  )}
                  <div>
                    <strong>{agent?.codename ?? "Operative"}</strong>
                    <div className="empty-note">
                      {mission?.title ?? d.missionId}
                      {mission ? ` · ${regionName(mission.region_id)}` : ""}
                      {d.playHash ? ` · sealed` : ""}
                    </div>
                  </div>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => openBrief(d.missionId)}
                  >
                    Case
                  </button>
                  {canReturnToSquad(d) ? (
                    <button
                      type="button"
                      className="btn ghost"
                      title={COPY.returnToSquadHint}
                      onClick={() =>
                        releaseDeployment(d.missionId, d.agentId)
                      }
                    >
                      {COPY.returnToSquad}
                    </button>
                  ) : (
                    <span
                      className="empty-note"
                      title={COPY.returnToSquadLocked}
                    >
                      Locked on case
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn"
          style={{ marginTop: "0.75rem" }}
          onClick={() => setScreen("map")}
        >
          Open cases
        </button>
      </div>

      {past.length > 0 && (
        <div className="panel">
          <h3 className="panel-title">Returned</h3>
          <ul className="list-quiet">
            {past.map((d) => {
              const agent = agents.find((a) => a.id === d.agentId);
              const mission = titleFor(d.missionId);
              return (
                <li key={`${d.missionId}-${d.agentId}-past`}>
                  <span>
                    {agent?.codename ?? "Operative"} ·{" "}
                    {mission?.title ?? d.missionId}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => openDebrief(d.missionId)}
                  >
                    Debrief
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

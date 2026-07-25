"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  fetchMission,
  MOCK_MISSIONS,
  regionName,
  type MissionListItem,
} from "@/lib/api";
import {
  COPY,
  durationLabel,
  regionLore,
  statusLabel,
} from "@/lib/copy";
import { formatCountdown, formatOgFromWei } from "@/lib/format";
import { useUiStore } from "../stores/uiStore";
import { useSquadStore } from "../stores/squadStore";
import { useFieldStore } from "../stores/fieldStore";
import { useLoadoutStore } from "../stores/loadoutStore";
import { agentPortraitSrc } from "../stores/squadStore";

export function BriefScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const setScreen = useUiStore((s) => s.setScreen);
  const openLoadout = useUiStore((s) => s.openLoadout);
  const openDebrief = useUiStore((s) => s.openDebrief);
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const selectAgent = useUiStore((s) => s.selectAgent);
  const agents = useSquadStore((s) => s.agents);
  const getForMission = useFieldStore((s) => s.getForMission);
  const getActiveForAgent = useFieldStore((s) => s.getActiveForAgent);
  const beginLoadout = useLoadoutStore((s) => s.begin);
  const { isConnected } = useAccount();

  const [mission, setMission] = useState<MissionListItem | null>(
    () => MOCK_MISSIONS.find((m) => m.id === missionId) ?? null,
  );

  useEffect(() => {
    if (!missionId) return;
    const mock = MOCK_MISSIONS.find((m) => m.id === missionId) ?? null;
    setMission(mock);
    let cancelled = false;
    fetchMission(missionId).then((row) => {
      if (!cancelled && row) setMission(row);
    });
    return () => {
      cancelled = true;
    };
  }, [missionId]);

  if (!missionId || !mission) {
    return (
      <div className="screen-pad">
        <p className="empty-note">No mission selected.</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setScreen("map")}
        >
          Back to map
        </button>
      </div>
    );
  }

  const deployment = getForMission(mission.id);
  const readyAgents = agents.filter((a) => !getActiveForAgent(a.id));
  const selected =
    agents.find((a) => a.id === selectedAgentId) ?? readyAgents[0] ?? null;

  function startDeploy() {
    if (!selected || !isConnected) return;
    beginLoadout(mission!, selected);
    openLoadout(mission!.id);
  }

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
        {COPY.briefingTitle}
      </h2>
      <p className="panel-sub">{mission.title}</p>

      <div className="split-2">
        <div className="panel">
          <div className="chip-row" style={{ marginBottom: "0.75rem" }}>
            <span
              className={`chip ${
                mission.status === "open" ? "open" : "settled"
              }`}
            >
              {statusLabel(mission.status)}
            </span>
            <span className="chip">
              {COPY.entryStake}{" "}
              <strong>{formatOgFromWei(mission.entry_fee_wei)}</strong>
            </span>
            <span className="chip">
              {COPY.purse}{" "}
              <strong>
                {formatOgFromWei(mission.prize_pool_wei ?? "0")}
              </strong>
            </span>
            <span className="chip">
              {COPY.window}{" "}
              <strong>{formatCountdown(mission.ends_at)}</strong>
            </span>
            <span className="chip">
              {durationLabel(mission.duration)}
            </span>
          </div>
          <p>
            <strong>{regionName(mission.region_id)}</strong>
          </p>
          <p className="panel-sub">{regionLore(mission.region_id)}</p>
          <p>{mission.public_brief}</p>
          <p className="empty-note" style={{ marginTop: "1rem" }}>
            {COPY.classifiedSealed}
          </p>
          {mission.status === "settled" && (
            <button
              type="button"
              className="btn"
              style={{ marginTop: "1rem" }}
              onClick={() => openDebrief(mission.id)}
            >
              Open debrief
            </button>
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Deploy</h3>
          {deployment?.status === "in_field" ? (
            <p className="empty-note">
              Already in the field with this window. Check Field desk.
            </p>
          ) : mission.status !== "open" ? (
            <p className="empty-note">Window is not open for deploy.</p>
          ) : (
            <>
              {!isConnected && (
                <p className="empty-note">{COPY.connectWallet}</p>
              )}
              <div className="roster">
                {readyAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    className={`roster-card${
                      selected?.id === agent.id ? " selected" : ""
                    }`}
                    onClick={() => selectAgent(agent.id)}
                  >
                    <img
                      src={agentPortraitSrc(agent)}
                      alt={agent.codename}
                    />
                    <strong>{agent.codename}</strong>
                    <span>{agent.archetype}</span>
                  </button>
                ))}
              </div>
              {readyAgents.length === 0 && (
                <p className="empty-note">
                  No free operatives — wait for field return or recruit.
                </p>
              )}
              <button
                type="button"
                className="btn"
                disabled={!selected || !isConnected}
                onClick={startDeploy}
              >
                {COPY.deployCta}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

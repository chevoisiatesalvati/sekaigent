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
import { useSquadStore, agentPortraitSrc } from "../stores/squadStore";
import { useFieldStore } from "../stores/fieldStore";
import { useLoadoutStore } from "../stores/loadoutStore";
import type { CaseDocument } from "@sekaigent/game-schemas";

const KIND_LABEL: Record<string, string> = {
  clipping: "Clipping",
  cable: "Cable",
  witness: "Witness",
  ledger: "Ledger",
  rumor: "Rumor",
  photo_note: "Photo note",
};

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
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    const mock = MOCK_MISSIONS.find((m) => m.id === missionId) ?? null;
    setMission(mock);
    setDocId(mock?.case_file?.[0]?.id ?? null);
    let cancelled = false;
    fetchMission(missionId).then((row) => {
      if (!cancelled && row) {
        setMission(row);
        setDocId((prev) => prev ?? row.case_file?.[0]?.id ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [missionId]);

  if (!missionId || !mission) {
    return (
      <div className="screen-pad">
        <p className="empty-note">No case selected.</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setScreen("map")}
        >
          Back to cases
        </button>
      </div>
    );
  }

  const docs: CaseDocument[] = mission.case_file ?? [];
  const activeDoc = docs.find((d) => d.id === docId) ?? docs[0];
  const deployment = getForMission(mission.id);
  const readyAgents = agents.filter((a) => !getActiveForAgent(a.id));
  const selected =
    agents.find((a) => a.id === selectedAgentId) ?? readyAgents[0] ?? null;

  function startOrders() {
    if (!selected || !isConnected || agents.length === 0) return;
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
        ← Cases
      </button>
      <h2 className="panel-title" style={{ marginTop: "0.5rem" }}>
        {COPY.briefingTitle}
      </h2>
      <p className="panel-sub">{mission.title}</p>

      <div className="chip-row" style={{ marginBottom: "0.85rem" }}>
        <span
          className={`chip ${mission.status === "open" ? "open" : "settled"}`}
        >
          {statusLabel(mission.status)}
        </span>
        <span className="chip">
          {COPY.entryStake}{" "}
          <strong>{formatOgFromWei(mission.entry_fee_wei)}</strong>
        </span>
        <span className="chip">
          {COPY.purse}{" "}
          <strong>{formatOgFromWei(mission.prize_pool_wei ?? "0")}</strong>
        </span>
        <span className="chip">
          {COPY.window} <strong>{formatCountdown(mission.ends_at)}</strong>
        </span>
        <span className="chip">{durationLabel(mission.duration)}</span>
        <span className="chip">{regionName(mission.region_id)}</span>
      </div>

      <p className="panel-sub">{regionLore(mission.region_id)}</p>
      <p style={{ marginBottom: "1rem" }}>{mission.public_brief}</p>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="panel-title">Dossier</h3>
        <p className="panel-sub">
          Read carefully. Some pages matter. Some are noise. Your orders should
          show you know which is which.
        </p>
        {docs.length === 0 ? (
          <p className="empty-note">No dossier pages on this case yet.</p>
        ) : (
          <div className="dossier-layout">
            <div className="dossier-nav">
              {docs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`dossier-doc-btn${
                    activeDoc?.id === d.id ? " active" : ""
                  }`}
                  onClick={() => setDocId(d.id)}
                >
                  {d.title}
                </button>
              ))}
            </div>
            {activeDoc && (
              <div className="dossier-body">
                <div className="dossier-kind">
                  {KIND_LABEL[activeDoc.kind] ?? activeDoc.kind}
                </div>
                <strong>{activeDoc.title}</strong>
                <p style={{ marginTop: "0.65rem" }}>{activeDoc.body}</p>
              </div>
            )}
          </div>
        )}
        <p className="empty-note" style={{ marginTop: "0.75rem" }}>
          {COPY.classifiedSealed}
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-title">Send into the field</h3>
        {deployment?.status === "in_field" ? (
          <p className="empty-note">
            Already deployed on this case. Check Field.
          </p>
        ) : mission.status !== "open" ? (
          mission.status === "settled" ? (
            <button
              type="button"
              className="btn"
              onClick={() => openDebrief(mission.id)}
            >
              Open debrief
            </button>
          ) : (
            <p className="empty-note">This case is not open for orders.</p>
          )
        ) : agents.length === 0 ? (
          <p className="empty-note">
            Hire an operative in Squad before writing orders.
          </p>
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
                  <img src={agentPortraitSrc(agent)} alt={agent.codename} />
                  <strong>{agent.codename}</strong>
                  <span>{agent.archetype}</span>
                </button>
              ))}
            </div>
            {readyAgents.length === 0 && (
              <p className="empty-note">
                No free operatives — wait for a return or hire another.
              </p>
            )}
            <button
              type="button"
              className="btn"
              disabled={!selected || !isConnected}
              onClick={startOrders}
            >
              {COPY.deployCta}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

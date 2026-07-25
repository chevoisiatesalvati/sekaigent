"use client";

import dynamic from "next/dynamic";
import { COPY, SKILL_LABELS, type SkillKey } from "@/lib/copy";
import { formatWinRate } from "@/lib/format";
import { useUiStore } from "../stores/uiStore";
import {
  agentPortraitSrc,
  skillSum,
  useSquadStore,
} from "../stores/squadStore";
import { useFieldStore } from "../stores/fieldStore";
import { SKILL_KEYS } from "../types";

const AgentShowcase = dynamic(
  () =>
    import("../three/AgentShowcase").then((m) => m.AgentShowcase),
  { ssr: false, loading: () => <div className="agent-showcase-wrap" /> },
);

export function SquadScreen() {
  const agents = useSquadStore((s) => s.agents);
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const selectAgent = useUiStore((s) => s.selectAgent);
  const openAgentEdit = useUiStore((s) => s.openAgentEdit);
  const setScreen = useUiStore((s) => s.setScreen);
  const getActiveForAgent = useFieldStore((s) => s.getActiveForAgent);

  const selected =
    agents.find((a) => a.id === selectedAgentId) ?? agents[0] ?? null;

  return (
    <div className="screen-scroll">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <h2 className="panel-title">{COPY.squadTitle}</h2>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            Manage operatives — profile, skills, character, memory.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setScreen("recruit")}
        >
          {COPY.recruitTitle}
        </button>
      </div>

      {agents.length === 0 ? (
        <p className="empty-note">{COPY.squadEmpty}</p>
      ) : (
        <>
          <div className="roster">
            {agents.map((agent) => {
              const deployed = Boolean(getActiveForAgent(agent.id));
              const isSelected = selected?.id === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  className={`roster-card${isSelected ? " selected" : ""}`}
                  onClick={() => selectAgent(agent.id)}
                >
                  <img
                    src={agentPortraitSrc(agent)}
                    alt={agent.codename}
                  />
                  <strong>{agent.codename}</strong>
                  <span>
                    {agent.archetype}
                    {deployed ? ` · ${COPY.readinessDeployed}` : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="split-2">
              <div className="panel">
                <div className="agent-showcase-wrap" style={{ marginBottom: "1rem" }}>
                  <AgentShowcase
                    portraitSrc={agentPortraitSrc(selected)}
                    codename={selected.codename}
                    archetype={selected.archetype}
                  />
                </div>
                <h3 className="panel-title">{selected.codename}</h3>
                <p className="panel-sub">{selected.publicSummary}</p>
                <div className="chip-row">
                  <span className="chip">
                    Lv <strong>{selected.level}</strong>
                  </span>
                  <span className="chip">
                    XP <strong>{selected.xp}</strong>
                  </span>
                  <span className="chip">
                    Form <strong>{formatWinRate(selected.winRate)}</strong>
                  </span>
                  <span className="chip">
                    Missions <strong>{selected.missionCount}</strong>
                  </span>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openAgentEdit(selected.id)}
                  >
                    Edit operative
                  </button>
                </div>
              </div>
              <div className="panel">
                <h3 className="panel-title">Tradecraft</h3>
                <p className="panel-sub">
                  Points {skillSum(selected.skills)} · {selected.personality}
                </p>
                {SKILL_KEYS.map((key: SkillKey) => (
                  <div className="meter" key={key}>
                    <span className="meter-label">{SKILL_LABELS[key]}</span>
                    <div className="meter-track">
                      <div
                        className="meter-fill"
                        style={{ width: `${selected.skills[key]}%` }}
                      />
                    </div>
                    <span className="meter-val">{selected.skills[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

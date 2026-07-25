"use client";

import { useMemo, useState } from "react";
import { SKILL_LABELS, type SkillKey } from "@/lib/copy";
import {
  ARCHETYPES,
  PORTRAITS,
  portraitsForArchetype,
  type Archetype,
} from "@/lib/portraits";
import { useUiStore } from "../stores/uiStore";
import {
  skillSum,
  useSquadStore,
} from "../stores/squadStore";
import { SKILL_KEYS, SKILL_POINT_BUDGET, type AgentEditTab } from "../types";

const TABS: Array<{ id: AgentEditTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "skills", label: "Skills" },
  { id: "character", label: "Character" },
  { id: "memory", label: "Memory" },
];

export function AgentEditScreen() {
  const agentId = useUiStore((s) => s.selectedAgentId);
  const tab = useUiStore((s) => s.agentEditTab);
  const setTab = useUiStore((s) => s.setAgentEditTab);
  const setScreen = useUiStore((s) => s.setScreen);
  const agent = useSquadStore((s) =>
    s.agents.find((a) => a.id === agentId),
  );
  const updateAgent = useSquadStore((s) => s.updateAgent);

  const [rulesText, setRulesText] = useState<string | null>(null);

  const portraits = useMemo(
    () =>
      agent
        ? portraitsForArchetype(agent.archetype).length
          ? portraitsForArchetype(agent.archetype)
          : PORTRAITS
        : [],
    [agent],
  );

  if (!agent) {
    return (
      <div className="screen-pad">
        <p className="empty-note">No operative selected.</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setScreen("squad")}
        >
          Back to squad
        </button>
      </div>
    );
  }

  const total = skillSum(agent.skills);
  const remaining = SKILL_POINT_BUDGET - total;
  const behaviorText =
    rulesText ?? agent.behaviorRules.join("\n");

  function setSkill(key: SkillKey, rawValue: number) {
    const current = agent!.skills[key];
    const others = total - current;
    const capped = Math.max(
      0,
      Math.min(100, Math.min(rawValue, SKILL_POINT_BUDGET - others)),
    );
    updateAgent(agent!.id, {
      skills: { ...agent!.skills, [key]: capped },
    });
  }

  return (
    <div className="screen-scroll">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <div>
          <h2 className="panel-title">Edit · {agent.codename}</h2>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            Standing profile feeds mission loadouts and evaluations.
          </p>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setScreen("squad")}
        >
          Done
        </button>
      </div>

      <div className="tabs" style={{ marginTop: "1rem" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {tab === "profile" && (
          <>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={agent.name}
                onChange={(e) =>
                  updateAgent(agent.id, { name: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="codename">Codename</label>
              <input
                id="codename"
                value={agent.codename}
                onChange={(e) =>
                  updateAgent(agent.id, { codename: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="archetype">Archetype</label>
              <select
                id="archetype"
                value={agent.archetype}
                onChange={(e) => {
                  const archetype = e.target.value as Archetype;
                  const nextPortraits = portraitsForArchetype(archetype);
                  updateAgent(agent.id, {
                    archetype,
                    portraitId: nextPortraits[0]?.id ?? agent.portraitId,
                  });
                }}
              >
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="summary">Public summary</label>
              <textarea
                id="summary"
                value={agent.publicSummary}
                onChange={(e) =>
                  updateAgent(agent.id, { publicSummary: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Portrait</label>
              <div className="portrait-grid">
                {portraits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`portrait-opt${
                      agent.portraitId === p.id ? " selected" : ""
                    }`}
                    onClick={() =>
                      updateAgent(agent.id, { portraitId: p.id })
                    }
                    title={p.label}
                  >
                    <img src={p.src} alt={p.label} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "skills" && (
          <>
            <div className={`budget-bar${remaining < 0 ? " over" : ""}`}>
              <span>Skill budget</span>
              <strong>
                {total} / {SKILL_POINT_BUDGET}
                {remaining > 0 ? ` · ${remaining} free` : ""}
              </strong>
            </div>
            {SKILL_KEYS.map((key) => (
              <div className="meter" key={key}>
                <span className="meter-label">{SKILL_LABELS[key]}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={agent.skills[key]}
                  onChange={(e) => setSkill(key, Number(e.target.value))}
                />
                <span className="meter-val">{agent.skills[key]}</span>
              </div>
            ))}
            <p className="empty-note">
              Redistribute within {SKILL_POINT_BUDGET} points. No skill trees —
              raise one meter by lowering another.
            </p>
          </>
        )}

        {tab === "character" && (
          <>
            <div className="field">
              <label htmlFor="personality">Personality</label>
              <textarea
                id="personality"
                value={agent.personality}
                onChange={(e) =>
                  updateAgent(agent.id, { personality: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="rules">Behaviour rules (one per line)</label>
              <textarea
                id="rules"
                value={behaviorText}
                onChange={(e) => setRulesText(e.target.value)}
                onBlur={() => {
                  const rules = behaviorText
                    .split("\n")
                    .map((r) => r.trim())
                    .filter(Boolean);
                  updateAgent(agent.id, { behaviorRules: rules });
                  setRulesText(null);
                }}
              />
            </div>
          </>
        )}

        {tab === "memory" && (
          <div className="field">
            <label htmlFor="memory">Memory digest</label>
            <textarea
              id="memory"
              value={agent.memoryDigest}
              onChange={(e) =>
                updateAgent(agent.id, { memoryDigest: e.target.value })
              }
              placeholder="Short notes the operative carries between missions."
            />
          </div>
        )}
      </div>
    </div>
  );
}

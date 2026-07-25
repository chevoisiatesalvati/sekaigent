"use client";

import { COPY } from "@/lib/copy";
import {
  countMissionOrdersWords,
  missionOrdersWordMax,
} from "../lib/wordBudget";
import { useUiStore } from "../stores/uiStore";
import { useLoadoutStore } from "../stores/loadoutStore";
import { useSquadStore } from "../stores/squadStore";

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function LoadoutScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const openSeal = useUiStore((s) => s.openSeal);
  const openBrief = useUiStore((s) => s.openBrief);
  const draft = useLoadoutStore((s) => s.draft);
  const agentId = useLoadoutStore((s) => s.agentId);
  const setDraft = useLoadoutStore((s) => s.setDraft);
  const setSteps = useLoadoutStore((s) => s.setSteps);
  const setListField = useLoadoutStore((s) => s.setListField);
  const agent = useSquadStore((s) =>
    s.agents.find((a) => a.id === agentId),
  );

  if (!missionId || !draft || !agent) {
    return (
      <div className="screen-pad">
        <p className="empty-note">Start from a case file first.</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => (missionId ? openBrief(missionId) : undefined)}
        >
          Back
        </button>
      </div>
    );
  }

  const maxWords = missionOrdersWordMax(agent.level);
  const used = countMissionOrdersWords(draft);
  const overBudget = used > maxWords;

  function updateStep(
    index: number,
    patch: { action?: string; detail?: string },
  ) {
    const steps = draft!.steps.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    setSteps(steps);
  }

  function addStep() {
    if (draft!.steps.length >= 8) return;
    setSteps([
      ...draft!.steps,
      { action: "Step", detail: "Describe the move." },
    ]);
  }

  function removeStep(index: number) {
    if (draft!.steps.length <= 3) return;
    setSteps(draft!.steps.filter((_, i) => i !== index));
  }

  return (
    <div className="screen-scroll">
      <button
        type="button"
        className="btn ghost"
        onClick={() => openBrief(missionId)}
      >
        ← Case file
      </button>
      <h2 className="panel-title" style={{ marginTop: "0.5rem" }}>
        {COPY.ordersTitle} · {agent.codename}
      </h2>
      <p className="panel-sub">
        Write orders that prove you read the dossier. Standing rules:{" "}
        {agent.behaviorRules.slice(0, 2).join(" · ") || "none set"}.
      </p>

      <div className="panel">
        <div className={`word-meter${overBudget ? " over" : ""}`}>
          <span>Order word budget (level {agent.level})</span>
          <strong>
            {used} / {maxWords}
          </strong>
        </div>
        <p className="empty-note" style={{ marginBottom: "0.85rem" }}>
          Counts approach, step details, risks, resources, contingencies, and
          claim. Step names (Recon / Execute / …) are free. Budget: 50 words at
          level 1, +10 per level.
        </p>

        <div className="field">
          <label htmlFor="approach">Approach</label>
          <textarea
            id="approach"
            value={draft.approach}
            placeholder="How will they work this case? Pull signal from the dossier."
            onChange={(e) => setDraft({ approach: e.target.value })}
          />
        </div>

        <label
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--paper-dim)",
            display: "block",
            marginBottom: "0.5rem",
          }}
        >
          Steps ({draft.steps.length}/8, min 3)
        </label>
        {draft.steps.map((step, index) => (
          <div className="step-row" key={index}>
            <input
              value={step.action}
              onChange={(e) => updateStep(index, { action: e.target.value })}
              placeholder="Action"
            />
            <input
              value={step.detail}
              onChange={(e) => updateStep(index, { detail: e.target.value })}
              placeholder="Detail"
            />
            <button
              type="button"
              className="btn ghost"
              disabled={draft.steps.length <= 3}
              onClick={() => removeStep(index)}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn secondary"
          disabled={draft.steps.length >= 8}
          onClick={addStep}
          style={{ marginBottom: "1rem" }}
        >
          Add step
        </button>

        <div className="field">
          <label htmlFor="risks">Risks accepted (one per line)</label>
          <textarea
            id="risks"
            value={draft.risksAccepted.join("\n")}
            onChange={(e) =>
              setListField("risksAccepted", linesToList(e.target.value))
            }
          />
        </div>
        <div className="field">
          <label htmlFor="resources">Resources used (one per line)</label>
          <textarea
            id="resources"
            value={draft.resourcesUsed.join("\n")}
            onChange={(e) =>
              setListField("resourcesUsed", linesToList(e.target.value))
            }
          />
        </div>
        <div className="field">
          <label htmlFor="contingencies">Contingencies (one per line)</label>
          <textarea
            id="contingencies"
            value={draft.contingencies.join("\n")}
            onChange={(e) =>
              setListField("contingencies", linesToList(e.target.value))
            }
          />
        </div>
        <div className="field">
          <label htmlFor="claim">Final outcome claim</label>
          <textarea
            id="claim"
            value={draft.finalOutcomeClaim}
            onChange={(e) =>
              setDraft({ finalOutcomeClaim: e.target.value })
            }
          />
        </div>

        <div className="action-row">
          <button
            type="button"
            className="btn"
            disabled={
              overBudget ||
              draft.steps.length < 3 ||
              !draft.approach.trim() ||
              !draft.finalOutcomeClaim.trim()
            }
            onClick={() => openSeal(missionId, agent.id)}
          >
            {COPY.sealDeploy}
          </button>
        </div>
        <p className="empty-note" style={{ marginTop: "0.75rem" }}>
          {COPY.fieldPlanSealed}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ORDER_FALLBACKS,
  ORDER_STYLES,
  assembleMissionPlayFromChoices,
  missionOrdersWordMax,
  type OrderFallbackId,
  type OrderStyleId,
} from "@sekaigent/sdk/orders";
import { COPY } from "@/lib/copy";
import { suggestOrders } from "@/lib/api";
import { countMissionOrdersWords } from "../lib/wordBudget";
import { useUiStore } from "../stores/uiStore";
import {
  leadChoicesFromMission,
  useLoadoutStore,
} from "../stores/loadoutStore";
import { useSquadStore } from "../stores/squadStore";
import type { MissionPlayDraft } from "../types";

function playToDraft(play: {
  approach: string;
  steps: Array<{ action: string; detail: string }>;
  risksAccepted: string[];
  resourcesUsed: string[];
  contingencies: string[];
  finalOutcomeClaim: string;
}): MissionPlayDraft {
  return {
    approach: play.approach,
    steps: play.steps,
    risksAccepted: play.risksAccepted,
    resourcesUsed: play.resourcesUsed,
    contingencies: play.contingencies,
    finalOutcomeClaim: play.finalOutcomeClaim,
  };
}

export function LoadoutScreen() {
  const missionId = useUiStore((s) => s.selectedMissionId);
  const openSeal = useUiStore((s) => s.openSeal);
  const openBrief = useUiStore((s) => s.openBrief);
  const mission = useLoadoutStore((s) => s.mission);
  const agentId = useLoadoutStore((s) => s.agentId);
  const leadIds = useLoadoutStore((s) => s.leadIds);
  const styleId = useLoadoutStore((s) => s.styleId);
  const fallbackId = useLoadoutStore((s) => s.fallbackId);
  const commanderNote = useLoadoutStore((s) => s.commanderNote);
  const phase = useLoadoutStore((s) => s.phase);
  const source = useLoadoutStore((s) => s.source);
  const toast = useLoadoutStore((s) => s.toast);
  const draft = useLoadoutStore((s) => s.draft);
  const setStyleId = useLoadoutStore((s) => s.setStyleId);
  const setFallbackId = useLoadoutStore((s) => s.setFallbackId);
  const setCommanderNote = useLoadoutStore((s) => s.setCommanderNote);
  const setPhase = useLoadoutStore((s) => s.setPhase);
  const setDraft = useLoadoutStore((s) => s.setDraft);
  const setToast = useLoadoutStore((s) => s.setToast);
  const backToChoices = useLoadoutStore((s) => s.backToChoices);
  const agent = useSquadStore((s) =>
    s.agents.find((a) => a.id === agentId),
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast, setToast]);

  if (!missionId || !mission || !agent || !styleId || !fallbackId) {
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

  const selectedLeads = leadChoicesFromMission(mission, leadIds);
  const maxWords = missionOrdersWordMax(agent.level);
  const used = draft ? countMissionOrdersWords(draft) : 0;
  const overBudget = used > maxWords;
  const canBrief =
    selectedLeads.length >= 1 &&
    selectedLeads.length <= 4 &&
    Boolean(styleId) &&
    Boolean(fallbackId);

  async function briefOperative() {
    if (!canBrief || !agent || !mission || !styleId || !fallbackId) return;
    const activeStyle = styleId;
    const activeFallback = fallbackId;
    const activeAgent = agent;
    const activeMission = mission;
    setPhase("briefing");
    const assembleOffline = () =>
      assembleMissionPlayFromChoices({
        missionId: activeMission.id,
        agentTokenId: activeAgent.id,
        publicBrief: activeMission.public_brief,
        caseLeads: selectedLeads,
        styleId: activeStyle,
        fallbackId: activeFallback,
        commanderNote: commanderNote.trim() || undefined,
        agent: {
          personality: activeAgent.personality,
          skills: activeAgent.skills,
          behaviorRules: activeAgent.behaviorRules,
          memoryDigest: activeAgent.memoryDigest,
        },
        wordBudgetMax: maxWords,
      });

    try {
      const remote = await suggestOrders({
        missionId: activeMission.id,
        agentTokenId: activeAgent.id,
        publicBrief: activeMission.public_brief,
        caseLeads: selectedLeads,
        styleId: activeStyle,
        fallbackId: activeFallback,
        commanderNote: commanderNote.trim() || undefined,
        agentIntel: {
          personality: activeAgent.personality,
          skills: activeAgent.skills,
          behaviorRules: activeAgent.behaviorRules,
          memoryDigest: activeAgent.memoryDigest,
        },
        wordBudgetMax: maxWords,
      });

      if (remote?.play) {
        setDraft(playToDraft(remote.play), remote.source);
        if (remote.source === "offline") {
          setToast(COPY.ordersOfflineToast);
        }
        return;
      }

      setDraft(playToDraft(assembleOffline()), "offline");
      setToast(COPY.ordersOfflineToast);
    } catch {
      setDraft(playToDraft(assembleOffline()), "offline");
      setToast(COPY.ordersOfflineToast);
    }
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
      <p className="panel-sub">{COPY.ordersLead}</p>

      <div className="objective-banner" role="region" aria-label="Objective">
        <span className="objective-label">{COPY.objectiveLabel}</span>
        <p className="objective-text">{mission.public_brief}</p>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.p
            className="orders-toast"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {phase === "briefing" ? (
        <motion.div
          className="panel orders-briefing"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.55, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          <p className="panel-sub" style={{ margin: 0 }}>
            {COPY.ordersBriefing(agent.codename)}
          </p>
        </motion.div>
      ) : null}

      {phase === "choices" ? (
        <div className="panel orders-desk">
          <section className="orders-stage">
            <h3 className="orders-stage-title">{COPY.ordersSignalsLocked}</h3>
            <ul className="orders-signal-list">
              {selectedLeads.map((lead) => (
                <li key={lead.id}>
                  <strong>{lead.title}</strong>
                  <span>{lead.excerpt}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn ghost"
              onClick={() => openBrief(missionId)}
              style={{ marginTop: "0.35rem" }}
            >
              Change Signals on case file
            </button>
          </section>

          <section className="orders-stage">
            <h3 className="orders-stage-title">{COPY.ordersStageStyle}</h3>
            <div className="chip-row">
              {ORDER_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`chip choice-chip${styleId === style.id ? " selected" : ""}`}
                  onClick={() => setStyleId(style.id as OrderStyleId)}
                >
                  {style.label}
                </button>
              ))}
            </div>
            <div className="field" style={{ marginTop: "0.85rem" }}>
              <label htmlFor="commander-note">{COPY.ordersCommanderNote}</label>
              <textarea
                id="commander-note"
                value={commanderNote}
                placeholder={COPY.ordersCommanderPlaceholder(agent.codename)}
                onChange={(e) => setCommanderNote(e.target.value)}
                rows={2}
              />
            </div>
          </section>

          <section className="orders-stage">
            <h3 className="orders-stage-title">{COPY.ordersStageFallback}</h3>
            <div className="chip-row">
              {ORDER_FALLBACKS.map((fb) => (
                <button
                  key={fb.id}
                  type="button"
                  className={`chip choice-chip${fallbackId === fb.id ? " selected" : ""}`}
                  onClick={() => setFallbackId(fb.id as OrderFallbackId)}
                >
                  {fb.label}
                </button>
              ))}
            </div>
          </section>

          <div className="action-row">
            <button
              type="button"
              className="btn"
              disabled={!canBrief}
              onClick={() => void briefOperative()}
            >
              {COPY.ordersBriefCta}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "preview" && draft ? (
        <div className="panel orders-preview">
          <div className={`word-meter${overBudget ? " over" : ""}`}>
            <span>
              Order word budget (level {agent.level})
              {source ? ` · ${source === "compute" ? "live" : "desk"}` : ""}
            </span>
            <strong>
              {used} / {maxWords}
            </strong>
          </div>

          <article className="orders-narrative">
            <h3>Approach</h3>
            <p>{draft.approach}</p>
            <h3>Moves</h3>
            <ul className="orders-moves">
              {draft.steps.map((step, index) => (
                <li key={`${step.action}-${index}`}>
                  <strong>{step.action}</strong>
                  <span>{step.detail}</span>
                </li>
              ))}
            </ul>
            <h3>If it breaks</h3>
            <p>{draft.contingencies[0] ?? "—"}</p>
            <h3>Outcome claim</h3>
            <p>{draft.finalOutcomeClaim}</p>
          </article>

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
            <button
              type="button"
              className="btn secondary"
              onClick={() => void briefOperative()}
            >
              {COPY.ordersRebrief}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={backToChoices}
            >
              {COPY.ordersBackChoices}
            </button>
          </div>
          <p className="empty-note" style={{ marginTop: "0.75rem" }}>
            {COPY.fieldPlanSealed}
          </p>
        </div>
      ) : null}
    </div>
  );
}

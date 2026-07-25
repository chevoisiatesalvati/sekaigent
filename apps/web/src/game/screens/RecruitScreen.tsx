"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { COPY } from "@/lib/copy";
import {
  ARCHETYPES,
  portraitsForArchetype,
  type Archetype,
} from "@/lib/portraits";
import { useUiStore } from "../stores/uiStore";
import { useSquadStore } from "../stores/squadStore";

export function RecruitScreen() {
  const { isConnected, chainId } = useAccount();
  const setScreen = useUiStore((s) => s.setScreen);
  const openAgentEdit = useUiStore((s) => s.openAgentEdit);
  const recruit = useSquadStore((s) => s.recruit);

  const [name, setName] = useState("");
  const [codename, setCodename] = useState("");
  const [archetype, setArchetype] = useState<Archetype>("Infiltrator");
  const [portraitId, setPortraitId] = useState(
    () => portraitsForArchetype("Infiltrator")[0]?.id ?? "",
  );
  const [personality, setPersonality] = useState(
    "Professional, adaptable, loyal to the desk.",
  );
  const [error, setError] = useState<string | null>(null);

  const portraits = useMemo(
    () => portraitsForArchetype(archetype),
    [archetype],
  );

  const walletOk = isConnected;

  function onArchetype(next: Archetype) {
    setArchetype(next);
    const first = portraitsForArchetype(next)[0];
    if (first) setPortraitId(first.id);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!walletOk) {
      setError(COPY.connectWallet);
      return;
    }
    try {
      const agent = recruit({
        name,
        codename,
        archetype,
        portraitId,
        personality,
      });
      openAgentEdit(agent.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recruit failed.");
    }
  }

  return (
    <div className="screen-scroll">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <h2 className="panel-title">{COPY.recruitTitle}</h2>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            Local roster mint — chain mint comes later. Wallet required.
          </p>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setScreen("squad")}
        >
          Cancel
        </button>
      </div>

      <form className="panel" style={{ marginTop: "1rem" }} onSubmit={onSubmit}>
        {!walletOk && (
          <p className="empty-note" style={{ marginBottom: "1rem" }}>
            {COPY.connectWallet}
            {chainId != null ? ` (chain ${chainId})` : ""}
          </p>
        )}
        <div className="field">
          <label htmlFor="r-name">Name</label>
          <input
            id="r-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="r-code">Codename</label>
          <input
            id="r-code"
            required
            value={codename}
            onChange={(e) => setCodename(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="r-arch">Archetype</label>
          <select
            id="r-arch"
            value={archetype}
            onChange={(e) => onArchetype(e.target.value as Archetype)}
          >
            {ARCHETYPES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Portrait</label>
          <div className="portrait-grid">
            {portraits.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`portrait-opt${
                  portraitId === p.id ? " selected" : ""
                }`}
                onClick={() => setPortraitId(p.id)}
                title={p.label}
              >
                <img src={p.src} alt={p.label} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-pers">Personality</label>
          <textarea
            id="r-pers"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
          />
        </div>
        {error && <p className="empty-note">{error}</p>}
        <button type="submit" className="btn" disabled={!walletOk}>
          {COPY.recruitCta}
        </button>
      </form>
    </div>
  );
}

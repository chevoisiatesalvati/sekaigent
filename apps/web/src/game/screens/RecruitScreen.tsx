"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { COPY } from "@/lib/copy";
import {
  ARCHETYPES,
  portraitsForArchetype,
  type Archetype,
} from "@/lib/portraits";
import { PERSONALITY_PRESETS } from "@/lib/personalities";
import { useUiStore } from "../stores/uiStore";
import { useSquadStore } from "../stores/squadStore";
import { useMintAgent } from "../hooks/useChainActions";

export function RecruitScreen() {
  const { isConnected, chainId } = useAccount();
  const setScreen = useUiStore((s) => s.setScreen);
  const openAgentEdit = useUiStore((s) => s.openAgentEdit);
  const recruit = useSquadStore((s) => s.recruit);
  const updateAgent = useSquadStore((s) => s.updateAgent);
  const { mintIfPossible, status: mintStatus } = useMintAgent();

  const [name, setName] = useState("");
  const [codename, setCodename] = useState("");
  const [archetype, setArchetype] = useState<Archetype>("Infiltrator");
  const [portraitId, setPortraitId] = useState(
    () => portraitsForArchetype("Infiltrator")[0]?.id ?? "",
  );
  const [personalityPresetId, setPersonalityPresetId] = useState(
    PERSONALITY_PRESETS[0]?.id ?? "",
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!walletOk) {
      setError(COPY.connectWallet);
      return;
    }
    if (!personalityPresetId) {
      setError("Choose a personality.");
      return;
    }
    try {
      const agent = recruit({
        name,
        codename,
        archetype,
        portraitId,
        personalityPresetId,
      });
      const minted = await mintIfPossible(agent);
      if (minted?.tokenId) {
        updateAgent(agent.id, {
          dossierNumber: minted.tokenId,
          onChain: true,
        });
      }
      openAgentEdit(agent.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hire failed.");
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
            Pick a personality at hire — it locks for the operative. Wallet
            required. On-chain mint runs when the minter role is available;
            otherwise the desk stays local.
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
          <label>Personality (required)</label>
          <div className="personality-grid">
            {PERSONALITY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`personality-opt${
                  personalityPresetId === p.id ? " selected" : ""
                }`}
                onClick={() => setPersonalityPresetId(p.id)}
              >
                <strong>{p.name}</strong>
                <span>{p.personality}</span>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="empty-note">{error}</p>}
        {mintStatus && <p className="empty-note">{mintStatus}</p>}
        <button type="submit" className="btn" disabled={!walletOk}>
          {COPY.recruitCta}
        </button>
      </form>
    </div>
  );
}

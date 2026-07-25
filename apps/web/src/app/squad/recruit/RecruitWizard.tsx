"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { PortraitPicker } from "@/components/PortraitPicker";
import { TradecraftMeters } from "@/components/TradecraftMeters";
import { COPY } from "@/lib/copy";
import { OG_CHAIN_ID } from "@/lib/chain";
import {
  ARCHETYPES,
  portraitsForArchetype,
  skillBiasForArchetype,
  type Archetype,
} from "@/lib/portraits";
import { ownerStorageKey, recruitAgent } from "@/lib/squad";

export function RecruitWizard() {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const [name, setName] = useState("");
  const [codename, setCodename] = useState("");
  const [archetype, setArchetype] = useState<Archetype>("Infiltrator");
  const [portraitId, setPortraitId] = useState(
    () => portraitsForArchetype("Infiltrator")[0]?.id ?? "inf-01",
  );
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const skills = useMemo(() => skillBiasForArchetype(archetype), [archetype]);
  const onChain = isConnected && chainId === OG_CHAIN_ID;

  function onArchetypeChange(next: Archetype) {
    setArchetype(next);
    const first = portraitsForArchetype(next)[0];
    if (first) setPortraitId(first.id);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!onChain) {
      setError(COPY.connectWallet);
      return;
    }
    try {
      const agent = recruitAgent(ownerStorageKey(address), {
        name,
        codename,
        archetype,
        portraitId,
        publicSummary: summary,
      });
      router.push(`/squad/${agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recruit failed");
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="agent-name">Name</label>
        <input
          id="agent-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          placeholder="Ada Vale"
        />
      </div>
      <div className="field">
        <label htmlFor="agent-codename">Codename</label>
        <input
          id="agent-codename"
          value={codename}
          onChange={(e) => setCodename(e.target.value)}
          required
          minLength={2}
          placeholder="NIGHTJAR"
        />
      </div>
      <div className="field">
        <label htmlFor="agent-archetype">Archetype</label>
        <select
          id="agent-archetype"
          value={archetype}
          onChange={(e) => onArchetypeChange(e.target.value as Archetype)}
        >
          {ARCHETYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <span>Portrait</span>
        <PortraitPicker
          archetype={archetype}
          value={portraitId}
          onChange={setPortraitId}
        />
      </div>
      <div className="field">
        <label htmlFor="agent-summary">Public summary</label>
        <textarea
          id="agent-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Quiet operative. Details classified."
        />
      </div>
      <section className="panel stack">
        <h2>Tradecraft preview</h2>
        <TradecraftMeters skills={skills} />
      </section>
      {error && <p className="muted">{error}</p>}
      {!onChain && <p className="muted">{COPY.connectWallet}</p>}
      <button className="btn signal" type="submit" disabled={!onChain}>
        {COPY.recruitCta}
      </button>
    </form>
  );
}

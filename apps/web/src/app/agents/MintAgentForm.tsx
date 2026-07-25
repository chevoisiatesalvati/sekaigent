"use client";

import { useAccount } from "wagmi";
import { useState } from "react";

export function MintAgentForm() {
  const { isConnected, chainId } = useAccount();
  const [codename, setCodename] = useState("NIGHTJAR");
  const ready = isConnected && chainId === 16661;

  return (
    <section className="panel stack">
      <h2>Mint agent</h2>
      <label className="field">
        Codename
        <input
          value={codename}
          onChange={(e) => setCodename(e.target.value)}
        />
      </label>
      <button
        className="btn"
        disabled={!ready || !codename}
        onClick={() => {
          alert(
            `Mint ${codename} — API will seal intel to 0G Storage then call SekaiAgent.mint after Phase 5 deploy.`,
          );
        }}
      >
        {ready ? "Mint on 0G Mainnet" : "Connect on 0G Mainnet to mint"}
      </button>
    </section>
  );
}

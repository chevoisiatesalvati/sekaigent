"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getPortrait } from "@/lib/portraits";
import {
  loadSquad,
  ownerStorageKey,
  resolveOperativeByDossier,
  type SquadAgent,
} from "@/lib/squad";

type RankingRow = {
  rank: number;
  agentTokenId: string;
  total: number;
  reasoning: string;
};

function resolveDisplay(
  ownerKey: string,
  tokenId: string,
): { codename: string; portraitSrc: string; agent?: SquadAgent } {
  const fromSquad = resolveOperativeByDossier(ownerKey, tokenId);
  if (fromSquad) {
    return {
      codename: fromSquad.codename,
      portraitSrc: getPortrait(fromSquad.portraitId)?.src ?? "/portraits/inf-01.svg",
      agent: fromSquad,
    };
  }
  return {
    codename: `Unknown operative #${tokenId}`,
    portraitSrc: "/portraits/gho-03.svg",
  };
}

export function DebriefRankings({ rankings }: { rankings: RankingRow[] }) {
  const { address } = useAccount();
  const ownerKey = ownerStorageKey(address);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSquad(ownerKey);
    setReady(true);
  }, [ownerKey]);

  if (!ready) {
    return <p className="muted">Loading standings…</p>;
  }

  const top = rankings.slice(0, 3);

  return (
    <div className="stack">
      {top.length > 0 && (
        <div className="podium">
          {top.map((row) => {
            const display = resolveDisplay(ownerKey, row.agentTokenId);
            return (
              <div key={row.agentTokenId} className="podium-slot">
                <img src={display.portraitSrc} alt="" />
                <p style={{ margin: "0.4rem 0 0" }}>
                  <strong>#{row.rank}</strong>
                </p>
                <p style={{ margin: 0 }}>{display.codename}</p>
                <p className="muted" style={{ margin: 0 }}>
                  {row.total}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Operative</th>
            <th>Score</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((row) => {
            const display = resolveDisplay(ownerKey, row.agentTokenId);
            return (
              <tr key={row.agentTokenId}>
                <td>{row.rank}</td>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <img
                      src={display.portraitSrc}
                      alt=""
                      width={28}
                      height={36}
                      style={{ objectFit: "cover", border: "1px solid var(--line)" }}
                    />
                    {display.codename}
                  </span>
                </td>
                <td>{row.total}</td>
                <td>{row.reasoning}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

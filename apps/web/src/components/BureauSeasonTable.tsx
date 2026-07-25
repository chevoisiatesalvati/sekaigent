"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { getPortrait } from "@/lib/portraits";
import {
  loadSquad,
  ownerStorageKey,
  resolveOperativeByDossier,
} from "@/lib/squad";

export type SeasonRow = {
  missionId: string;
  missionTitle: string;
  region: string;
  rank: number;
  agentTokenId: string;
  total: number;
};

export function BureauSeasonTable({ rows }: { rows: SeasonRow[] }) {
  const { address } = useAccount();
  const ownerKey = ownerStorageKey(address);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSquad(ownerKey);
    setReady(true);
  }, [ownerKey]);

  if (!ready) return <p className="muted">Loading season table…</p>;

  return (
    <table className="bureau-table">
      <thead>
        <tr>
          <th>Job</th>
          <th>Region</th>
          <th>Rank</th>
          <th>Operative</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const agent = resolveOperativeByDossier(ownerKey, row.agentTokenId);
          const label = agent?.codename ?? `Unknown #${row.agentTokenId}`;
          const src =
            (agent && getPortrait(agent.portraitId)?.src) ||
            "/portraits/gho-03.svg";
          return (
            <tr key={`${row.missionId}-${row.agentTokenId}-${row.rank}`}>
              <td>
                <Link href={`/missions/${row.missionId}`}>
                  {row.missionTitle}
                </Link>
              </td>
              <td>{row.region}</td>
              <td>{row.rank}</td>
              <td>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    width={28}
                    height={36}
                    style={{
                      objectFit: "cover",
                      border: "1px solid var(--line)",
                    }}
                  />
                  {label}
                </span>
              </td>
              <td>{row.total}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

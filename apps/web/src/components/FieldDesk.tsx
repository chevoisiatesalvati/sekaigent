"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { loadDeployments, type FieldDeployment } from "@/lib/field-ops";
import { getAgent, ownerStorageKey } from "@/lib/squad";
import { StatusChip } from "./StatusChip";
import { COPY } from "@/lib/copy";

export function FieldDesk() {
  const { address } = useAccount();
  const ownerKey = ownerStorageKey(address);
  const [rows, setRows] = useState<FieldDeployment[]>([]);

  useEffect(() => {
    setRows(loadDeployments(ownerKey).filter((d) => d.status === "in_field"));
  }, [ownerKey]);

  if (rows.length === 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        No operatives in the field. Open the mission board to deploy.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {rows.map((row) => {
        const agent = getAgent(ownerKey, row.agentId);
        return (
          <li
            key={`${row.missionId}-${row.agentId}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              padding: "0.65rem 0",
              borderBottom: "1px solid var(--line)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong>{agent?.codename ?? "Operative"}</strong>
              <span className="muted"> → </span>
              <Link href={`/missions/${row.missionId}`}>{row.missionId}</Link>
            </div>
            <StatusChip status="in_field" label={COPY.inTheField} />
          </li>
        );
      })}
    </ul>
  );
}

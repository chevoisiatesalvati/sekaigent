"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminMissionForm } from "@/app/admin/AdminMissionForm";
import {
  fetchMissions,
  revealMissionAdmin,
  type MissionListItem,
} from "@/lib/api";
import { statusLabel } from "@/lib/copy";
import { formatOgFromWei } from "@/lib/format";
import { useIsVaultAdmin } from "@/game/hooks/useIsVaultAdmin";

/**
 * Command = Bureau Ops: create cases on-chain (via API + ADMIN_PRIVATE_KEY)
 * and reveal criteria after the deadline. Visible only to MissionVault admin.
 */
export function HqScreen() {
  const { isAdmin, isLoading, address } = useIsVaultAdmin();
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [revealMsg, setRevealMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchMissions().then(setMissions);
  }, []);

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin, reload]);

  async function onReveal(mission: MissionListItem) {
    if (!address || !isAdmin) {
      setRevealMsg("Connect the MissionVault admin wallet first.");
      return;
    }
    setBusyId(mission.id);
    setRevealMsg(null);
    try {
      const body = await revealMissionAdmin(address, mission.id);
      setRevealMsg(JSON.stringify(body, null, 2));
      reload();
    } catch (err) {
      setRevealMsg(err instanceof Error ? err.message : "Reveal failed");
    } finally {
      setBusyId(null);
    }
  }

  const revealable = missions.filter(
    (m) =>
      m.on_chain_id != null &&
      (m.status === "open" || m.status === "evaluating") &&
      new Date(m.ends_at).getTime() <= Date.now(),
  );

  if (isLoading) {
    return (
      <div className="screen-scroll">
        <p className="empty-note">Checking admin role…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="screen-scroll">
        <p className="panel-sub" style={{ marginBottom: "0.35rem" }}>
          Bureau Ops
        </p>
        <h2 className="panel-title">Restricted</h2>
        <p className="panel-sub" style={{ maxWidth: "36rem" }}>
          Connect the MissionVault admin wallet (deployer) on 0G Mainnet to
          author and reveal cases.
        </p>
      </div>
    );
  }

  return (
    <div className="screen-scroll">
      <p className="panel-sub" style={{ marginBottom: "0.35rem" }}>
        Bureau Ops
      </p>
      <h2 className="panel-title">Command</h2>
      <p className="panel-sub" style={{ marginBottom: "1rem", maxWidth: "36rem" }}>
        Author live cases (dossier + hidden criteria). Nest broadcasts{" "}
        <code>createMission</code> when <code>ADMIN_PRIVATE_KEY</code> is set.
        After the deadline, reveal criteria so the settle job can grade and pay.
      </p>

      <div className="panel" style={{ marginBottom: "1.25rem" }}>
        <h3 className="panel-title">Create case</h3>
        <AdminMissionForm
          onCreated={() => {
            reload();
          }}
        />
      </div>

      <div className="panel" style={{ marginBottom: "1.25rem" }}>
        <h3 className="panel-title">Reveal after deadline</h3>
        <p className="panel-sub" style={{ marginBottom: "0.75rem" }}>
          Uses your connected admin wallet. Only missions past their deadline
          with an on-chain id appear here.
        </p>
        {revealable.length === 0 ? (
          <p className="empty-note">No cases ready to reveal.</p>
        ) : (
          <ul className="list-quiet">
            {revealable.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.title}</strong>
                  <div className="empty-note">
                    on-chain #{m.on_chain_id} · {statusLabel(m.status)} · tax{" "}
                    {formatOgFromWei(m.entry_fee_wei)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busyId === m.id}
                  onClick={() => onReveal(m)}
                >
                  {busyId === m.id ? "Revealing…" : "Reveal"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {revealMsg && (
          <pre
            className="empty-note"
            style={{ whiteSpace: "pre-wrap", marginTop: "0.75rem" }}
          >
            {revealMsg}
          </pre>
        )}
      </div>

      <div className="panel">
        <h3 className="panel-title">Case board</h3>
        <ul className="list-quiet">
          {missions.length === 0 && (
            <li className="empty-note">No cases in the API yet.</li>
          )}
          {missions.map((m) => (
            <li key={m.id}>
              <span>
                <strong>{m.title}</strong>
                <span className="empty-note">
                  {" "}
                  · {statusLabel(m.status)}
                  {m.on_chain_id != null
                    ? ` · chain #${m.on_chain_id}`
                    : " · API-only"}
                  {` · ${(m.case_file ?? []).length} dossier pages`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

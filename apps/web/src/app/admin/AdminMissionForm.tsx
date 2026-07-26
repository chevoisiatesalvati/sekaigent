"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { CaseDocument, CaseDocumentKind } from "@sekaigent/game-schemas";
import { createMissionAdmin, REGIONS } from "@/lib/api";
import { ogAmountToWei } from "@/lib/contracts";
import { useIsVaultAdmin } from "@/game/hooks/useIsVaultAdmin";
import type { MissionDuration } from "@sekaigent/game-schemas";

const DEMO_DURATION_MS = 5 * 60 * 1000;

const KINDS: CaseDocumentKind[] = [
  "clipping",
  "cable",
  "witness",
  "ledger",
  "rumor",
  "photo_note",
];

function emptyDoc(): CaseDocument {
  return {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    kind: "cable",
    title: "",
    body: "",
  };
}

type AdminMissionFormProps = {
  onCreated?: () => void;
};

export function AdminMissionForm({ onCreated }: AdminMissionFormProps) {
  const { address } = useAccount();
  const { isAdmin, isLoading } = useIsVaultAdmin();
  const [title, setTitle] = useState("Harbor Manifest");
  const [regionId, setRegionId] = useState("harbor");
  const [publicBrief, setPublicBrief] = useState(
    "Something left Pier 7's cage tonight. Recover the shipment manifest without raising alarms.",
  );
  const [hiddenCriteria, setHiddenCriteria] = useState(
    "no bribes; stealth only; prefer night shift",
  );
  const [solutionNotes, setSolutionNotes] = useState(
    "Signal vs noise notes for debrief.",
  );
  const [taxOg, setTaxOg] = useState("0.001");
  const [duration, setDuration] = useState<MissionDuration>("demo");
  const [docs, setDocs] = useState<CaseDocument[]>([emptyDoc()]);
  const [result, setResult] = useState("");

  function updateDoc(index: number, patch: Partial<CaseDocument>) {
    setDocs((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function endsAtForDuration(kind: MissionDuration): string {
    const ms =
      kind === "demo"
        ? DEMO_DURATION_MS
        : (kind === "daily" ? 1 : kind === "weekly" ? 7 : 30) * 86400000;
    return new Date(Date.now() + ms).toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !isAdmin) {
      setResult("Connect the MissionVault admin wallet on 0G Mainnet.");
      return;
    }
    const startsAt = new Date().toISOString();
    const endsAt = endsAtForDuration(duration);
    try {
      const entryFeeWei = ogAmountToWei(taxOg).toString();
      const body = await createMissionAdmin(address, {
        regionId,
        title,
        publicBrief,
        caseFile: docs.filter((d) => d.title.trim() && d.body.trim()),
        duration,
        startsAt,
        endsAt,
        entryFeeWei,
        maxEntrants: 100,
        hiddenCriteria,
        solutionNotes,
        salt: crypto.randomUUID(),
      });
      setResult(JSON.stringify(body, null, 2));
      onCreated?.();
    } catch (error) {
      setResult(String(error));
    }
  }

  if (isLoading) {
    return <p className="empty-note">Checking admin role…</p>;
  }

  if (!isAdmin) {
    return (
      <p className="empty-note">
        Bureau Ops requires the MissionVault admin wallet (deployer) on 0G
        Mainnet.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="admin-title">Title</label>
        <input
          id="admin-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="admin-region">Region</label>
        <select
          id="admin-region"
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
        >
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="admin-hook">Hook (public brief)</label>
        <textarea
          id="admin-hook"
          rows={2}
          value={publicBrief}
          onChange={(e) => setPublicBrief(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Case file documents</label>
        {docs.map((doc, index) => (
          <div
            key={doc.id}
            style={{
              border: "1px solid var(--panel-border)",
              borderRadius: 8,
              padding: "0.65rem",
              marginBottom: "0.5rem",
            }}
          >
            <div className="field">
              <label>Kind</label>
              <select
                value={doc.kind}
                onChange={(e) =>
                  updateDoc(index, {
                    kind: e.target.value as CaseDocumentKind,
                  })
                }
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Title</label>
              <input
                value={doc.title}
                onChange={(e) => updateDoc(index, { title: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Body</label>
              <textarea
                rows={3}
                value={doc.body}
                onChange={(e) => updateDoc(index, { body: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn ghost"
              disabled={docs.length <= 1}
              onClick={() =>
                setDocs((rows) => rows.filter((_, i) => i !== index))
              }
            >
              Remove page
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn secondary"
          onClick={() => setDocs((rows) => [...rows, emptyDoc()])}
        >
          Add document
        </button>
      </div>
      <div className="field">
        <label htmlFor="admin-criteria">Hidden criteria</label>
        <textarea
          id="admin-criteria"
          rows={2}
          value={hiddenCriteria}
          onChange={(e) => setHiddenCriteria(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="admin-solution">Solution notes (debrief)</label>
        <textarea
          id="admin-solution"
          rows={2}
          value={solutionNotes}
          onChange={(e) => setSolutionNotes(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="admin-tax">Mission tax (0G)</label>
        <input
          id="admin-tax"
          value={taxOg}
          onChange={(e) => setTaxOg(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="admin-duration">Duration</label>
        <select
          id="admin-duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value as MissionDuration)}
        >
          <option value="demo">5-minute demo</option>
          <option value="daily">Daily case</option>
          <option value="weekly">Weekly case</option>
          <option value="monthly">Monthly case</option>
        </select>
      </div>
      <button className="btn" type="submit">
        Create case
      </button>
      {result && (
        <pre
          className="empty-note"
          style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}
        >
          {result}
        </pre>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";
import type { CaseDocument, CaseDocumentKind } from "@sekaigent/game-schemas";
import { createMissionAdmin, REGIONS } from "@/lib/api";
import { ogAmountToWei } from "@/lib/contracts";

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

export function AdminMissionForm() {
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
  const [duration, setDuration] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [token, setToken] = useState("");
  const [docs, setDocs] = useState<CaseDocument[]>([emptyDoc()]);
  const [result, setResult] = useState("");

  function updateDoc(index: number, patch: Partial<CaseDocument>) {
    setDocs((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = new Date().toISOString();
    const endsAt = new Date(
      Date.now() +
        (duration === "daily" ? 1 : duration === "weekly" ? 7 : 30) *
          86400000,
    ).toISOString();
    try {
      const entryFeeWei = ogAmountToWei(taxOg).toString();
      const body = await createMissionAdmin(token, {
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
    } catch (error) {
      setResult(String(error));
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="admin-token">Admin token</label>
        <input
          id="admin-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="HMAC admin bearer token"
        />
      </div>
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
          onChange={(e) =>
            setDuration(e.target.value as "daily" | "weekly" | "monthly")
          }
        >
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

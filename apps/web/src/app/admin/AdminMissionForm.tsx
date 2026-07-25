"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function AdminMissionForm() {
  const [title, setTitle] = useState("Harbor Manifest");
  const [regionId, setRegionId] = useState("harbor");
  const [publicBrief, setPublicBrief] = useState(
    "Recover the shipment manifest without raising alarms.",
  );
  const [hiddenCriteria, setHiddenCriteria] = useState(
    "no bribes; stealth only; prefer night shift",
  );
  const [token, setToken] = useState("");
  const [result, setResult] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + 86400000).toISOString();
    try {
      const res = await fetch(`${API_URL}/missions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          regionId,
          title,
          publicBrief,
          duration: "daily",
          startsAt,
          endsAt,
          entryFeeWei: "1000000000000000",
          maxEntrants: 100,
          hiddenCriteria,
          salt: crypto.randomUUID(),
        }),
      });
      const body = await res.json();
      setResult(JSON.stringify(body, null, 2));
    } catch (error) {
      setResult(String(error));
    }
  }

  return (
    <form className="panel stack" onSubmit={onSubmit}>
      <label className="field">
        Admin token
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="HMAC admin bearer token"
        />
      </label>
      <label className="field">
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        Region
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
        >
          <option value="harbor">Iron Harbor</option>
          <option value="embassy">Neutral Embassy</option>
          <option value="archive">Ash Archive</option>
          <option value="station">Relay Station</option>
        </select>
      </label>
      <label className="field">
        Public brief
        <textarea
          rows={3}
          value={publicBrief}
          onChange={(e) => setPublicBrief(e.target.value)}
        />
      </label>
      <label className="field">
        Hidden criteria
        <textarea
          rows={3}
          value={hiddenCriteria}
          onChange={(e) => setHiddenCriteria(e.target.value)}
        />
      </label>
      <button className="btn" type="submit">
        Create mission
      </button>
      {result && (
        <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>
          {result}
        </pre>
      )}
    </form>
  );
}

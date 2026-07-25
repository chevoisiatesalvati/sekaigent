import Link from "next/link";
import { WorldMap } from "@/components/WorldMap";
import { StatusChip } from "@/components/StatusChip";
import { fetchMissions, regionName } from "@/lib/api";
import { COPY, durationLabel, regionLore } from "@/lib/copy";
import { formatCountdown, formatOgFromWei } from "@/lib/format";

export default async function MissionsPage() {
  const missions = await fetchMissions();
  const open = missions.filter((m) => m.status === "open");

  return (
    <main>
      <div className="page-head">
        <div>
          <h1>{COPY.missionsTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Pick a region. Read the brief. Send an operative when the window is
            open.
          </p>
        </div>
      </div>
      <WorldMap missions={missions} />
      <section className="panel stack">
        <h2>Open jobs</h2>
        {open.length === 0 ? (
          <p className="muted">No open jobs on the board right now.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {open.map((mission) => (
              <li
                key={mission.id}
                style={{
                  display: "grid",
                  gap: "0.35rem",
                  padding: "0.85rem 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div className="dossier-meta">
                  <Link href={`/missions/${mission.id}`}>
                    <strong>{mission.title}</strong>
                  </Link>
                  <StatusChip status={mission.status} />
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  {regionName(mission.region_id)} ·{" "}
                  {durationLabel(mission.duration)} · Stake{" "}
                  {formatOgFromWei(mission.entry_fee_wei)} ·{" "}
                  {formatCountdown(mission.ends_at)}
                </p>
                <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                  {regionLore(mission.region_id)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

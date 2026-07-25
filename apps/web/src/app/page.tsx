import Link from "next/link";
import { FieldDesk } from "@/components/FieldDesk";
import { SquadSpotlight } from "@/components/SquadSpotlight";
import { StatusChip } from "@/components/StatusChip";
import { fetchMissions, regionName } from "@/lib/api";
import { COPY } from "@/lib/copy";
import { formatCountdown, formatOgFromWei } from "@/lib/format";

export default async function HomePage() {
  const missions = await fetchMissions();
  const open = missions.filter((m) => m.status === "open").slice(0, 3);
  const spotlight = open[0];

  return (
    <main>
      <section className="hq-hero" aria-label="Operations HQ">
        <p className="muted" style={{ margin: 0, letterSpacing: "0.08em" }}>
          OPERATIONS HQ
        </p>
        <h1>{COPY.hqHeadline}</h1>
        <p className="muted">
          Manage your squad like a bureau chief. Dispatch them when the window
          opens — standings unlock at debrief.
        </p>
        <div className="hq-actions">
          <Link className="btn" href="/squad">
            {COPY.hqCtaSquad}
          </Link>
          <Link className="btn secondary" href="/missions">
            {COPY.hqCtaMissions}
          </Link>
        </div>
      </section>

      <div className="hq-desk">
        <section className="stack">
          <h2>In the field</h2>
          <FieldDesk />
          <h2>Squad spotlight</h2>
          <SquadSpotlight />
        </section>
        <section className="stack">
          <h2>Open callouts</h2>
          {spotlight ? (
            <div className="stack">
              <div className="dossier-meta">
                <StatusChip status={spotlight.status} />
                <span className="muted">
                  {regionName(spotlight.region_id)}
                </span>
              </div>
              <h3 style={{ margin: 0 }}>{spotlight.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {spotlight.public_brief}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Stake {formatOgFromWei(spotlight.entry_fee_wei)} ·{" "}
                {formatCountdown(spotlight.ends_at)}
              </p>
              <Link className="btn signal" href={`/missions/${spotlight.id}`}>
                Open briefing
              </Link>
            </div>
          ) : (
            <p className="muted">No open jobs. Check the Bureau for debriefs.</p>
          )}
          {open.length > 1 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {open.slice(1).map((mission) => (
                <li key={mission.id} style={{ padding: "0.5rem 0" }}>
                  <Link href={`/missions/${mission.id}`}>{mission.title}</Link>
                  <span className="muted">
                    {" "}
                    · {formatCountdown(mission.ends_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link className="btn secondary" href="/bureau">
            Bureau standings
          </Link>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { BureauSeasonTable } from "@/components/BureauSeasonTable";
import { DebriefRankings } from "@/components/DebriefRankings";
import { StatusChip } from "@/components/StatusChip";
import {
  fetchMissionAudit,
  fetchMissions,
  regionName,
  type MissionAudit,
  type MissionListItem,
} from "@/lib/api";
import { COPY } from "@/lib/copy";
import { formatOgFromWei } from "@/lib/format";

type SettledPack = {
  mission: MissionListItem;
  audit: MissionAudit;
};

export default async function BureauPage() {
  const missions = await fetchMissions();
  const settled = missions.filter((m) => m.status === "settled");

  const packs: SettledPack[] = [];
  for (const mission of settled) {
    const audit = await fetchMissionAudit(mission.id);
    if (audit?.rankings?.length) {
      packs.push({ mission, audit });
    }
  }

  const seasonRows = packs.flatMap(({ mission, audit }) =>
    (audit.rankings ?? []).map((row) => ({
      missionId: mission.id,
      missionTitle: mission.title,
      region: regionName(mission.region_id),
      rank: row.rank,
      agentTokenId: row.agentTokenId,
      total: row.total,
    })),
  );

  return (
    <main className="stack">
      <div className="page-head">
        <div>
          <h1>{COPY.bureauTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {COPY.bureauSubtitle}
          </p>
        </div>
        <Link className="btn secondary" href="/missions">
          Mission board
        </Link>
      </div>

      {packs.length === 0 ? (
        <p className="muted">
          No debriefs yet. Complete a mission window to fill the board.
        </p>
      ) : (
        <>
          <section className="panel stack">
            <h2>Season table</h2>
            <BureauSeasonTable rows={seasonRows} />
          </section>

          {packs.map(({ mission, audit }) => (
            <section key={mission.id} className="panel stack">
              <div className="page-head">
                <div>
                  <div className="dossier-meta">
                    <StatusChip status="settled" />
                    <span className="muted">
                      {regionName(mission.region_id)} · Purse{" "}
                      {formatOgFromWei(
                        mission.prize_pool_wei ?? mission.entry_fee_wei,
                      )}
                    </span>
                  </div>
                  <h2 style={{ margin: "0.35rem 0 0" }}>
                    <Link href={`/missions/${mission.id}`}>{mission.title}</Link>
                  </h2>
                </div>
              </div>
              <DebriefRankings rankings={audit.rankings ?? []} />
            </section>
          ))}
        </>
      )}
    </main>
  );
}

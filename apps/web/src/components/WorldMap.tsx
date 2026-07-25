import Link from "next/link";
import { REGIONS, type MissionListItem } from "@/lib/api";
import { regionLore } from "@/lib/copy";

export function WorldMap({ missions }: { missions: MissionListItem[] }) {
  return (
    <section className="mission-board" aria-label="Mission board">
      {REGIONS.map((region) => {
        const regionMissions = missions.filter((m) => m.region_id === region.id);
        const hasOpen = regionMissions.some((m) => m.status === "open");
        const allSettled =
          regionMissions.length > 0 &&
          regionMissions.every((m) => m.status === "settled");
        const pinClass = [
          "map-pin",
          hasOpen ? "open-pulse" : "",
          allSettled ? "archived" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={region.id}
            className={pinClass}
            style={{ left: `${region.x}%`, top: `${region.y}%` }}
          >
            <strong>{region.name}</strong>
            <span className="muted" style={{ display: "block", fontSize: "0.8rem" }}>
              {regionLore(region.id)}
            </span>
            <span className="muted">
              {regionMissions.length} job
              {regionMissions.length === 1 ? "" : "s"}
            </span>
            {regionMissions.slice(0, 2).map((mission) => (
              <div key={mission.id}>
                <Link href={`/missions/${mission.id}`}>{mission.title}</Link>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}

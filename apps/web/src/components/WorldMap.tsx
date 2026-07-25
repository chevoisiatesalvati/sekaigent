import Link from "next/link";
import { REGIONS, type MissionListItem } from "@/lib/api";

export function WorldMap({ missions }: { missions: MissionListItem[] }) {
  return (
    <section className="map-stage" aria-label="World map lobby">
      {REGIONS.map((region) => {
        const regionMissions = missions.filter((m) => m.region_id === region.id);
        return (
          <div
            key={region.id}
            className="map-pin"
            style={{ left: `${region.x}%`, top: `${region.y}%` }}
          >
            <strong>{region.name}</strong>
            <span className="muted">
              {regionMissions.length} open mission
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

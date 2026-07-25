import { fetchMissions } from "@/lib/api";
import { WorldMap } from "@/components/WorldMap";

export default async function HomePage() {
  const missions = await fetchMissions();
  return (
    <main>
      <WorldMap missions={missions} />
      <section className="panel">
        <h2>Open missions</h2>
        <p className="muted">
          Browse regions on the world map. Accept missions with your secret
          agents; rankings and reasonings unlock after settle.
        </p>
        <ul>
          {missions.map((mission) => (
            <li key={mission.id}>
              <a href={`/missions/${mission.id}`}>
                {mission.title} — {mission.region_id} ({mission.duration})
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

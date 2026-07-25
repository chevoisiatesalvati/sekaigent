import Link from "next/link";
import { SquadRoster } from "@/components/SquadRoster";
import { COPY } from "@/lib/copy";

export default function SquadPage() {
  return (
    <main className="stack">
      <div className="page-head">
        <div>
          <h1>{COPY.squadTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Your operatives. Pick a dossier, read the tradecraft, send them out.
          </p>
        </div>
        <Link className="btn signal" href="/squad/recruit">
          Recruit
        </Link>
      </div>
      <SquadRoster />
    </main>
  );
}

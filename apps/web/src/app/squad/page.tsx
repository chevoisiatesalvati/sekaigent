import Link from "next/link";
import { COPY } from "@/lib/copy";

/** Placeholder until 6.2 squad roster. */
export default function SquadPage() {
  return (
    <main className="stack">
      <div className="page-head">
        <div>
          <h1>{COPY.squadTitle}</h1>
          <p className="muted">Manage your operatives.</p>
        </div>
        <Link className="btn" href="/squad/recruit">
          Recruit
        </Link>
      </div>
      <p className="muted">Roster loading…</p>
    </main>
  );
}

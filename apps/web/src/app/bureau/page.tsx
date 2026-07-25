import { COPY } from "@/lib/copy";

/** Placeholder until 6.5 bureau standings. */
export default function BureauPage() {
  return (
    <main className="stack">
      <h1>{COPY.bureauTitle}</h1>
      <p className="muted">{COPY.bureauSubtitle}</p>
    </main>
  );
}

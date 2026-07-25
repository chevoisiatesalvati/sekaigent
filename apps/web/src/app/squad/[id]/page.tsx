import { COPY } from "@/lib/copy";

/** Placeholder until 6.2 dossier. */
export default async function DossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="stack">
      <h1>Dossier</h1>
      <p className="muted">
        {COPY.dossierFinePrint(id)} — full card coming online.
      </p>
    </main>
  );
}

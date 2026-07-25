import { AdminMissionForm } from "./AdminMissionForm";

/** Unlisted Bureau Ops — case authoring with dossier pages. */
export default function AdminPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        overflow: "auto",
        padding: "1.5rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.6rem",
            margin: "0 0 0.35rem",
          }}
        >
          Bureau Ops
        </h1>
        <p style={{ color: "var(--paper-dim)", margin: 0 }}>
          Author cases with a public dossier (signal + noise) and hidden
          criteria. Players only see the hook and dossier until debrief.
        </p>
      </div>
      <div className="panel">
        <AdminMissionForm />
      </div>
    </main>
  );
}

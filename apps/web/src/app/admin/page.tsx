import { AdminMissionForm } from "./AdminMissionForm";

/** Unlisted bureau ops — not in primary player nav. */
export default function AdminPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        overflow: "auto",
        padding: "1.5rem",
        maxWidth: 640,
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
          Bureau ops
        </h1>
        <p style={{ color: "var(--paper-dim)", margin: 0 }}>
          Author jobs with a classified briefing. Players only see the public
          brief until debrief.
        </p>
      </div>
      <div className="panel">
        <AdminMissionForm />
      </div>
    </main>
  );
}

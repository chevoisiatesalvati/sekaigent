import { AdminMissionForm } from "./AdminMissionForm";

/** Unlisted bureau ops — not in primary player nav. */
export default function AdminPage() {
  return (
    <main className="stack">
      <div>
        <h1>Bureau ops</h1>
        <p className="muted">
          Author jobs with a classified briefing. Players only see the public
          brief until debrief.
        </p>
      </div>
      <AdminMissionForm />
    </main>
  );
}

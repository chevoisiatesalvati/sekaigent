import { AdminMissionForm } from "./AdminMissionForm";

export default function AdminPage() {
  return (
    <main className="stack">
      <div>
        <h1>Admin console</h1>
        <p className="muted">
          Create missions with hidden criteria. Criteria stay committed until
          reveal after endsAt.
        </p>
      </div>
      <AdminMissionForm />
    </main>
  );
}

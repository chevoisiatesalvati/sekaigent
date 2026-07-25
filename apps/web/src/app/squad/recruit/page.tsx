import Link from "next/link";
import { RecruitWizard } from "./RecruitWizard";
import { COPY } from "@/lib/copy";

export default function RecruitPage() {
  return (
    <main className="stack">
      <div className="page-head">
        <div>
          <h1>{COPY.recruitTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Choose an archetype and a dossier portrait. Tradecraft starts from
            the archetype bias.
          </p>
        </div>
        <Link className="btn secondary" href="/squad">
          Back to squad
        </Link>
      </div>
      <RecruitWizard />
    </main>
  );
}

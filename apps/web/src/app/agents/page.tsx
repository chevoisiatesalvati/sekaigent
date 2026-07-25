import { MintAgentForm } from "./MintAgentForm";

const DEMO_AGENT = {
  name: "Ada Vale",
  codename: "NIGHTJAR",
  archetype: "Infiltrator",
  publicSummary:
    "Quiet operative specializing in forged credentials and night work.",
  level: 1,
  missionCount: 0,
  tokenId: "—",
};

export default function AgentsPage() {
  return (
    <main className="stack">
      <div>
        <h1>Agent Studio</h1>
        <p className="muted">
          Mint and inspect SekaiAgent Agentic IDs. Private intelligence stays
          encrypted on 0G Storage.
        </p>
      </div>
      <section className="panel stack">
        <h2>{DEMO_AGENT.codename}</h2>
        <p>
          {DEMO_AGENT.name} · {DEMO_AGENT.archetype}
        </p>
        <p>{DEMO_AGENT.publicSummary}</p>
        <p className="muted">
          Level {DEMO_AGENT.level} · Missions {DEMO_AGENT.missionCount} · Token{" "}
          {DEMO_AGENT.tokenId}
        </p>
      </section>
      <MintAgentForm />
    </main>
  );
}

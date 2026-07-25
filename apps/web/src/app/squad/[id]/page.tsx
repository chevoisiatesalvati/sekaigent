import { AgentDossier } from "./AgentDossier";

export default async function DossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentDossier agentId={id} />;
}

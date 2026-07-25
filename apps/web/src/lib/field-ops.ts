/** Local-only field deployments for Phase 6 shell (no chain txs). */

export type FieldDeployment = {
  missionId: string;
  agentId: string;
  status: "sealing" | "in_field" | "debriefed";
  deployedAt: number;
};

const STORAGE_PREFIX = "sekaigent.field.v1:";

function storageKey(ownerKey: string): string {
  return `${STORAGE_PREFIX}${ownerKey.toLowerCase()}`;
}

export function loadDeployments(ownerKey: string): FieldDeployment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(ownerKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FieldDeployment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeployments(ownerKey: string, rows: FieldDeployment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(ownerKey), JSON.stringify(rows));
}

export function getDeploymentForMission(
  ownerKey: string,
  missionId: string,
): FieldDeployment | undefined {
  return loadDeployments(ownerKey).find((d) => d.missionId === missionId);
}

export function getDeploymentForAgent(
  ownerKey: string,
  agentId: string,
): FieldDeployment | undefined {
  return loadDeployments(ownerKey).find(
    (d) => d.agentId === agentId && d.status === "in_field",
  );
}

export function upsertDeployment(
  ownerKey: string,
  deployment: FieldDeployment,
): void {
  const rows = loadDeployments(ownerKey).filter(
    (d) => d.missionId !== deployment.missionId,
  );
  rows.unshift(deployment);
  saveDeployments(ownerKey, rows);
}

export function markInField(
  ownerKey: string,
  missionId: string,
  agentId: string,
): FieldDeployment {
  const row: FieldDeployment = {
    missionId,
    agentId,
    status: "in_field",
    deployedAt: Date.now(),
  };
  upsertDeployment(ownerKey, row);
  return row;
}

import { statusLabel } from "@/lib/copy";

export function StatusChip({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const normalized = status.replace(/\s+/g, "_").toLowerCase();
  return (
    <span className={`status-chip ${normalized}`}>
      {label ?? statusLabel(status)}
    </span>
  );
}

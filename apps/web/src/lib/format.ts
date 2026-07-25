const WEI_PER_OG = 10n ** 18n;

/** Format wei string as player-facing 0G amount (never show "wei"). */
export function formatOgFromWei(wei: string | bigint): string {
  const value = typeof wei === "bigint" ? wei : BigInt(wei);
  if (value === 0n) return "0 0G";
  const whole = value / WEI_PER_OG;
  const frac = value % WEI_PER_OG;
  if (frac === 0n) return `${whole.toString()} 0G`;
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  const trimmed = fracStr.slice(0, 4).replace(/0+$/, "");
  return trimmed.length > 0
    ? `${whole.toString()}.${trimmed} 0G`
    : `${whole.toString()} 0G`;
}

export function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}% form`;
}

export function formatCountdown(endsAtIso: string, nowMs = Date.now()): string {
  const ends = new Date(endsAtIso).getTime();
  const delta = ends - nowMs;
  if (Number.isNaN(ends)) return "—";
  if (delta <= 0) return "Window closed";
  const hours = Math.floor(delta / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 2) return `${days} days left`;
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor(delta / 60_000));
  return `${mins}m left`;
}

export function formatPercent(score: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}

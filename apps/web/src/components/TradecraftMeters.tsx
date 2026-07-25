import { SKILL_LABELS, type SkillKey } from "@/lib/copy";

export function TradecraftMeters({
  skills,
}: {
  skills: Record<SkillKey, number>;
}) {
  const keys = Object.keys(SKILL_LABELS) as SkillKey[];
  return (
    <div className="stack" style={{ gap: "0.45rem" }}>
      {keys.map((key) => {
        const value = skills[key] ?? 0;
        return (
          <div key={key} className="tradecraft-meter">
            <span>{SKILL_LABELS[key]}</span>
            <div className="track" aria-hidden>
              <div className="fill" style={{ width: `${value}%` }} />
            </div>
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

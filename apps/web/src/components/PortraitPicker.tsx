"use client";

import { portraitsForArchetype, type Archetype } from "@/lib/portraits";

export function PortraitPicker({
  archetype,
  value,
  onChange,
}: {
  archetype: Archetype;
  value: string;
  onChange: (portraitId: string) => void;
}) {
  const options = portraitsForArchetype(archetype);
  return (
    <div className="portrait-picker" role="listbox" aria-label="Portrait">
      {options.map((portrait) => (
        <button
          key={portrait.id}
          type="button"
          className="portrait-option"
          role="option"
          aria-pressed={value === portrait.id}
          aria-selected={value === portrait.id}
          onClick={() => onChange(portrait.id)}
        >
          <img src={portrait.src} alt="" />
          <span>{portrait.label}</span>
        </button>
      ))}
    </div>
  );
}

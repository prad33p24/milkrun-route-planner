import type { ContainerPreset, ContainerInput } from "../types";

interface Props {
  presets: ContainerPreset[];
  value: ContainerInput;
  onChange: (value: ContainerInput) => void;
}

export default function ContainerSelector({ presets, value, onChange }: Props) {
  const grouped = presets.reduce<Record<string, ContainerPreset[]>>((acc, p) => {
    (acc[p.business_type] ??= []).push(p);
    return acc;
  }, {});

  const isCustom = !value.preset_id;

  function selectPreset(id: string) {
    if (id === "custom") {
      onChange({ ...value, preset_id: null, name: "Custom Vehicle", length_cm: 0, width_cm: 0, height_cm: 0, max_weight_kg: 0 });
    } else {
      onChange({ ...value, preset_id: id });
    }
  }

  return (
    <div className="container-selector">
      <label>
        Container / Vehicle Type
        <select value={value.preset_id ?? "custom"} onChange={(e) => selectPreset(e.target.value)}>
          {Object.entries(grouped).map(([businessType, items]) => (
            <optgroup key={businessType} label={businessType}>
              {items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.length_cm}×{p.width_cm}×{p.height_cm} cm, {p.max_weight_kg} kg)
                </option>
              ))}
            </optgroup>
          ))}
          <option value="custom">Custom dimensions…</option>
        </select>
      </label>

      {isCustom && (
        <div className="custom-dims">
          <label>
            Name
            <input value={value.name ?? ""} onChange={(e) => onChange({ ...value, name: e.target.value })} />
          </label>
          <label>
            Length (cm)
            <input
              type="number"
              value={value.length_cm ?? 0}
              onChange={(e) => onChange({ ...value, length_cm: Number(e.target.value) })}
            />
          </label>
          <label>
            Width (cm)
            <input
              type="number"
              value={value.width_cm ?? 0}
              onChange={(e) => onChange({ ...value, width_cm: Number(e.target.value) })}
            />
          </label>
          <label>
            Height (cm)
            <input
              type="number"
              value={value.height_cm ?? 0}
              onChange={(e) => onChange({ ...value, height_cm: Number(e.target.value) })}
            />
          </label>
          <label>
            Max Weight (kg)
            <input
              type="number"
              value={value.max_weight_kg ?? 0}
              onChange={(e) => onChange({ ...value, max_weight_kg: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      <label>
        Max containers to try (cap)
        <input
          type="number"
          value={value.max_units}
          onChange={(e) => onChange({ ...value, max_units: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}

import { useRef } from "react";
import * as XLSX from "xlsx";
import type { CargoItemInput } from "../types";

interface Props {
  cargoItems: CargoItemInput[];
  setCargoItems: (items: CargoItemInput[]) => void;
  cargoTypeSuggestions: string[];
}

const EMPTY_ROW: CargoItemInput = {
  name: "",
  cargo_type: "",
  length_cm: 0,
  width_cm: 0,
  height_cm: 0,
  weight_kg: 0,
  quantity: 1,
  stackable: true,
  fragile: false,
};

const TEMPLATE_HEADERS = [
  "name",
  "cargo_type",
  "length_cm",
  "width_cm",
  "height_cm",
  "weight_kg",
  "quantity",
  "stackable",
  "fragile",
];

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

export default function CargoTable({ cargoItems, setCargoItems, cargoTypeSuggestions }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateRow(index: number, field: keyof CargoItemInput, value: string | number | boolean) {
    const updated = [...cargoItems];
    updated[index] = { ...updated[index], [field]: value };
    setCargoItems(updated);
  }

  function addRow() {
    setCargoItems([...cargoItems, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    setCargoItems(cargoItems.filter((_, i) => i !== index));
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["Pallet A", "General / Palletized", 120, 100, 100, 200, 30, "true", "false"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cargo Template");
    XLSX.writeFile(wb, "cargo_template.xlsx");
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const parsed: CargoItemInput[] = rows
        .filter((r) => r.name)
        .map((r) => ({
          name: String(r.name ?? ""),
          cargo_type: String(r.cargo_type ?? ""),
          length_cm: Number(r.length_cm ?? 0),
          width_cm: Number(r.width_cm ?? 0),
          height_cm: Number(r.height_cm ?? 0),
          weight_kg: Number(r.weight_kg ?? 0),
          quantity: Number(r.quantity ?? 1),
          stackable: toBool(r.stackable ?? true),
          fragile: toBool(r.fragile ?? false),
        }));
      setCargoItems([...cargoItems, ...parsed]);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  return (
    <div className="cargo-table-section">
      <div className="cargo-table-toolbar">
        <button onClick={addRow}>+ Add Cargo Row</button>
        <button onClick={downloadTemplate}>Download Upload Template</button>
        <button onClick={() => fileInputRef.current?.click()}>Upload Template</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Cargo Type</th>
              <th>Length (cm)</th>
              <th>Width (cm)</th>
              <th>Height (cm)</th>
              <th>Weight (kg)</th>
              <th>Qty</th>
              <th>Stackable</th>
              <th>Fragile</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargoItems.map((item, i) => (
              <tr key={i}>
                <td>
                  <input value={item.name} onChange={(e) => updateRow(i, "name", e.target.value)} />
                </td>
                <td>
                  <input
                    list="cargo-type-suggestions"
                    value={item.cargo_type}
                    onChange={(e) => updateRow(i, "cargo_type", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.length_cm}
                    onChange={(e) => updateRow(i, "length_cm", Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.width_cm}
                    onChange={(e) => updateRow(i, "width_cm", Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.height_cm}
                    onChange={(e) => updateRow(i, "height_cm", Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.weight_kg}
                    onChange={(e) => updateRow(i, "weight_kg", Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateRow(i, "quantity", Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={item.stackable}
                    onChange={(e) => updateRow(i, "stackable", e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={item.fragile}
                    onChange={(e) => updateRow(i, "fragile", e.target.checked)}
                  />
                </td>
                <td>
                  <button onClick={() => removeRow(i)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="cargo-type-suggestions">
        {cargoTypeSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

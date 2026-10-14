import { Packer, Bin, Item } from "./binPacker";
import { determinePreferredOrientation } from "./orientationAnalysis";
import { CONTAINER_PRESET_MAP } from "../presets";
import type { CargoItemInput, ContainerInput, PackResponse, BinResult, CargoFitSummary, PlacedBox } from "../types";

function resolveContainer(container: ContainerInput): {
  name: string; length: number; width: number; height: number; maxWeight: number;
} {
  if (container.preset_id) {
    const preset = CONTAINER_PRESET_MAP[container.preset_id];
    if (!preset) throw new Error(`Unknown container preset_id: ${container.preset_id}`);
    return { name: preset.name, length: preset.length_cm, width: preset.width_cm, height: preset.height_cm, maxWeight: preset.max_weight_kg };
  }

  const missing = (["name", "length_cm", "width_cm", "height_cm", "max_weight_kg"] as const).filter(
    (f) => container[f] === null || container[f] === undefined
  );
  if (missing.length) {
    throw new Error(`Custom container missing required fields: ${missing.join(", ")}`);
  }

  return {
    name: container.name!,
    length: container.length_cm!,
    width: container.width_cm!,
    height: container.height_cm!,
    maxWeight: container.max_weight_kg!,
  };
}

const UNIT_SEP = "__unit__";

export function runPacking(container: ContainerInput, cargoItems: CargoItemInput[]): PackResponse {
  const warnings: string[] = [];

  const { name, length, width, height, maxWeight } = resolveContainer(container);
  const maxUnits = container.max_units;

  if (cargoItems.length === 0) {
    throw new Error("At least one cargo item is required.");
  }

  const packer = new Packer();
  for (let i = 0; i < maxUnits; i++) {
    packer.addBin(new Bin(`Container ${i + 1}`, length, width, height, maxWeight));
  }

  // Keyed by row index (not name) so duplicate cargo names never collide.
  const cargoLookup = new Map<string, { rowIdx: number; name: string; cargoType: string }>();
  const includedRows = new Set<number>();
  const unitNumberCounter = new Map<string, number>(); // per cargo name, for display numbering

  cargoItems.forEach((cargo, rowIdx) => {
    // Height is fixed vertical, so only the length x width footprint can be
    // checked against the container's floor plan up front - height must fit
    // as-is against the container's height.
    const footprintFits =
      (cargo.length_cm <= length && cargo.width_cm <= width) ||
      (cargo.width_cm <= length && cargo.length_cm <= width);
    if (!footprintFits || cargo.height_cm > height) {
      warnings.push(
        `'${cargo.name}' does not fit inside the container (height must stay vertical, so only 90-degree footprint rotation is tried) and will be excluded.`
      );
      return;
    }

    includedRows.add(rowIdx);

    // Per cargo type, figure out whether loading it unrotated-first or
    // rotated-first actually packs denser against this specific container -
    // by simulating a single-type fill both ways - and use whichever wins
    // as this row's default orientation for the real, combined pack.
    const preferredOrientation = determinePreferredOrientation(
      { length, width, height, maxWeight },
      { length: cargo.length_cm, width: cargo.width_cm, height: cargo.height_cm, weight: cargo.weight_kg, stackable: cargo.stackable }
    );

    for (let unitIdx = 0; unitIdx < cargo.quantity; unitIdx++) {
      const unitName = `row${rowIdx}${UNIT_SEP}${unitIdx}`;
      cargoLookup.set(unitName, { rowIdx, name: cargo.name, cargoType: cargo.cargo_type });
      packer.addItem(new Item(unitName, cargo.length_cm, cargo.width_cm, cargo.height_cm, cargo.weight_kg, cargo.stackable, cargo.quantity, preferredOrientation));
    }
  });

  if (cargoLookup.size === 0) {
    throw new Error("No cargo items could fit inside the selected container.");
  }

  packer.pack(true, true);

  const binVolume = length * width * height;
  const fittedQty = new Map<number, number>([...includedRows].map((r) => [r, 0]));
  const binsResult: BinResult[] = [];
  let containersUsed = 0;

  for (const bin of packer.bins) {
    if (bin.items.length === 0) continue;
    containersUsed += 1;
    const placedBoxes: PlacedBox[] = [];
    let usedVolume = 0;
    let usedWeight = 0;

    for (const item of bin.items) {
      const meta = cargoLookup.get(item.name)!;
      fittedQty.set(meta.rowIdx, (fittedQty.get(meta.rowIdx) ?? 0) + 1);

      const nextUnitNumber = (unitNumberCounter.get(meta.name) ?? 0) + 1;
      unitNumberCounter.set(meta.name, nextUnitNumber);

      const [dx, dy, dz] = item.getDimension();
      const [x, y, z] = item.position;
      const w = item.weight;

      usedVolume += dx * dy * dz;
      usedWeight += w;

      placedBoxes.push({
        cargo_name: meta.name,
        cargo_type: meta.cargoType,
        x, y, z,
        length: dx, width: dz, height: dy,
        rotation_type: item.orientation,
        weight: w,
        unit_number: nextUnitNumber,
      });
    }

    binsResult.push({
      bin_index: containersUsed,
      placed_boxes: placedBoxes,
      volume_used_pct: binVolume ? Math.round((100 * usedVolume / binVolume) * 10) / 10 : 0,
      weight_used_pct: maxWeight ? Math.round((100 * usedWeight / maxWeight) * 10) / 10 : 0,
    });
  }

  if (containersUsed === maxUnits) {
    warnings.push(
      `Reached the cap of ${maxUnits} containers; some cargo may be left unpacked. Increase max_units to see the true total.`
    );
  }

  const cargoSummary: CargoFitSummary[] = cargoItems
    .map((cargo, rowIdx) => ({ cargo, rowIdx }))
    .filter(({ rowIdx }) => includedRows.has(rowIdx))
    .map(({ cargo, rowIdx }) => ({
      name: cargo.name,
      cargo_type: cargo.cargo_type,
      requested_qty: cargo.quantity,
      fitted_qty: fittedQty.get(rowIdx) ?? 0,
      leftover_qty: cargo.quantity - (fittedQty.get(rowIdx) ?? 0),
    }));

  const totalVolumeCapacity = binVolume * containersUsed;
  const totalWeightCapacity = maxWeight * containersUsed;
  const totalUsedVolume = binsResult.reduce(
    (sum, b) => sum + b.placed_boxes.reduce((s, pb) => s + pb.length * pb.width * pb.height, 0),
    0
  );
  const totalUsedWeight = binsResult.reduce(
    (sum, b) => sum + b.placed_boxes.reduce((s, pb) => s + pb.weight, 0),
    0
  );

  return {
    container_name: name,
    container_dims: { length_cm: length, width_cm: width, height_cm: height, max_weight_kg: maxWeight },
    containers_used: containersUsed,
    bins: binsResult,
    cargo_summary: cargoSummary,
    total_volume_utilization_pct: totalVolumeCapacity ? Math.round((100 * totalUsedVolume / totalVolumeCapacity) * 10) / 10 : 0,
    total_weight_utilization_pct: totalWeightCapacity ? Math.round((100 * totalUsedWeight / totalWeightCapacity) * 10) / 10 : 0,
    warnings,
  };
}

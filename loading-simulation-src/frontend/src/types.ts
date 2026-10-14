export interface ContainerPreset {
  id: string;
  name: string;
  business_type: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  max_weight_kg: number;
  notes?: string | null;
}

export interface ContainerInput {
  preset_id?: string | null;
  name?: string | null;
  business_type?: string | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  max_weight_kg?: number | null;
  max_units: number;
}

export interface CargoItemInput {
  name: string;
  cargo_type: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  quantity: number;
  stackable: boolean;
  fragile: boolean;
}

export interface PlacedBox {
  cargo_name: string;
  cargo_type: string;
  /** x = along container length, y = vertical (height), z = along container width. */
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  rotation_type: number;
  weight: number;
  /** 1-based sequence number for this box among all units sharing its cargo_name. */
  unit_number: number;
}

export interface BinResult {
  bin_index: number;
  placed_boxes: PlacedBox[];
  volume_used_pct: number;
  weight_used_pct: number;
}

export interface CargoFitSummary {
  name: string;
  cargo_type: string;
  requested_qty: number;
  fitted_qty: number;
  leftover_qty: number;
}

export interface PackResponse {
  container_name: string;
  container_dims: { length_cm: number; width_cm: number; height_cm: number; max_weight_kg: number };
  containers_used: number;
  bins: BinResult[];
  cargo_summary: CargoFitSummary[];
  total_volume_utilization_pct: number;
  total_weight_utilization_pct: number;
  warnings: string[];
}

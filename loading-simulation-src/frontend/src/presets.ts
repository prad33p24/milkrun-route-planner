import type { ContainerPreset } from "./types";

// All dimensions in cm, weight in kg. Internal/usable dims, not exterior.
export const CONTAINER_PRESETS: ContainerPreset[] = [
  {
    id: "sea-20ft-standard",
    name: "20ft Standard Container",
    business_type: "Sea Freight",
    length_cm: 589.8, width_cm: 235.2, height_cm: 239.3,
    max_weight_kg: 28180,
    notes: "Most common ocean container for general cargo.",
  },
  {
    id: "sea-40ft-standard",
    name: "40ft Standard Container",
    business_type: "Sea Freight",
    length_cm: 1203.2, width_cm: 235.2, height_cm: 239.3,
    max_weight_kg: 26580,
  },
  {
    id: "sea-40ft-hc",
    name: "40ft High Cube Container",
    business_type: "Sea Freight",
    length_cm: 1203.2, width_cm: 235.2, height_cm: 269.8,
    max_weight_kg: 26512,
    notes: "Extra height, good for light/bulky cargo.",
  },
  {
    id: "sea-45ft-hc",
    name: "45ft High Cube Container",
    business_type: "Sea Freight",
    length_cm: 1355.6, width_cm: 235.2, height_cm: 269.8,
    max_weight_kg: 29500,
  },
  {
    id: "road-cargo-van",
    name: "Small Cargo Van",
    business_type: "Road Freight",
    length_cm: 250, width_cm: 170, height_cm: 170,
    max_weight_kg: 1000,
    notes: "Last-mile / small parcel delivery van.",
  },
  {
    id: "road-box-truck",
    name: "Box Truck (Medium)",
    business_type: "Road Freight",
    length_cm: 620, width_cm: 230, height_cm: 230,
    max_weight_kg: 3500,
  },
  {
    id: "road-large-truck",
    name: "Large Truck (32ft body)",
    business_type: "Road Freight",
    length_cm: 960, width_cm: 245, height_cm: 270,
    max_weight_kg: 24000,
  },
  {
    id: "road-trailer-13-6m",
    name: "Trailer (13.6m)",
    business_type: "Road Freight",
    length_cm: 1360, width_cm: 248, height_cm: 270,
    max_weight_kg: 24000,
    notes: "Standard EU/long-haul trailer.",
  },
  {
    id: "air-uld-ld3",
    name: "ULD LD3 Container",
    business_type: "Air Freight",
    length_cm: 156, width_cm: 153, height_cm: 163,
    max_weight_kg: 1588,
    notes: "Bounding box approximation of contoured ULD.",
  },
  {
    id: "air-uld-ld6",
    name: "ULD LD6 Container",
    business_type: "Air Freight",
    length_cm: 317, width_cm: 153, height_cm: 163,
    max_weight_kg: 3175,
  },
  {
    id: "air-pallet-pmc",
    name: "Air Pallet PMC (P6P)",
    business_type: "Air Freight",
    length_cm: 317, width_cm: 244, height_cm: 160,
    max_weight_kg: 6033,
    notes: "Flat pallet with net, height depends on contour gauge.",
  },
];

export const CONTAINER_PRESET_MAP: Record<string, ContainerPreset> = Object.fromEntries(
  CONTAINER_PRESETS.map((p) => [p.id, p])
);

export const CARGO_TYPE_SUGGESTIONS = [
  "General / Palletized",
  "Electronics",
  "Furniture",
  "Machinery",
  "Fragile Goods",
  "Perishables",
  "Textiles",
  "Automotive Parts",
  "Chemicals (Non-Hazmat)",
  "Boxed Retail Goods",
];

import type { ContainerInput, CargoItemInput, PackResponse } from "./types";
import { CONTAINER_PRESETS, CARGO_TYPE_SUGGESTIONS } from "./presets";
import { runPacking } from "./engine/pack";

// Everything runs client-side now (no backend) - these stay async so the
// calling components don't need to change.

export async function fetchContainerPresets() {
  return CONTAINER_PRESETS;
}

export async function fetchCargoTypeSuggestions() {
  return CARGO_TYPE_SUGGESTIONS;
}

export async function runPack(container: ContainerInput, cargo_items: CargoItemInput[]): Promise<PackResponse> {
  return runPacking(container, cargo_items);
}

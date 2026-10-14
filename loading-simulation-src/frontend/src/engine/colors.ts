export const PALETTE = [
  "#4f8ef7", "#f76e6e", "#6ee7b7", "#f7b84f", "#b98ef7",
  "#f76ec7", "#6ecff7", "#a3d977", "#f79f4f", "#8f8ff7",
];

/** Stable color per cargo name, consistent across the 3D view and the PDF export. */
export function colorForName(cargoName: string, allNames: string[]): string {
  const idx = allNames.indexOf(cargoName);
  return PALETTE[((idx < 0 ? 0 : idx) % PALETTE.length)];
}

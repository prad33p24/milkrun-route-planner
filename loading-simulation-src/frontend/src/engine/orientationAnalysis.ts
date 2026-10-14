import { Packer, Bin, Item } from "./binPacker";

interface ContainerDims {
  length: number;
  width: number;
  height: number;
  maxWeight: number;
}

interface CargoDims {
  length: number;
  width: number;
  height: number;
  weight: number;
  stackable: boolean;
}

/** How many units of a single cargo type fit into ONE container, forcing
 *  every unit to try `forcedOrientation` first (falling back to the other
 *  orientation only if the forced one doesn't fit at a given spot - the
 *  same real placement logic as the actual pack, just with one cargo type
 *  and one bin, since that's all this comparison needs). */
function simulateSingleTypeFill(container: ContainerDims, cargo: CargoDims, qty: number, forcedOrientation: 0 | 1): number {
  const packer = new Packer();
  packer.addBin(new Bin("trial", container.length, container.width, container.height, container.maxWeight));
  for (let i = 0; i < qty; i++) {
    packer.addItem(new Item(`t${i}`, cargo.length, cargo.width, cargo.height, cargo.weight, cargo.stackable, qty, forcedOrientation));
  }
  packer.pack(true, false);
  return packer.bins[0].items.length;
}

/** For one cargo type, determines whether "unrotated first" (0) or "rotated
 *  first" (1) packs denser against this specific container, by actually
 *  simulating a single-type fill both ways with a surplus quantity (enough
 *  to exceed one container's capacity, so the comparison reflects the true
 *  per-container ceiling rather than being limited by however many units
 *  were actually requested) and keeping whichever fits more. */
export function determinePreferredOrientation(container: ContainerDims, cargo: CargoDims): 0 | 1 {
  const containerVolume = container.length * container.width * container.height;
  const cargoVolume = cargo.length * cargo.width * cargo.height;
  if (cargoVolume <= 0 || containerVolume <= 0) return 0;

  const roughCapacity = Math.ceil(containerVolume / cargoVolume);
  const surplusQty = Math.min(Math.max(roughCapacity * 2, 10), 3000);

  const unrotatedFirstCount = simulateSingleTypeFill(container, cargo, surplusQty, 0);
  const rotatedFirstCount = simulateSingleTypeFill(container, cargo, surplusQty, 1);

  return rotatedFirstCount > unrotatedFirstCount ? 1 : 0;
}

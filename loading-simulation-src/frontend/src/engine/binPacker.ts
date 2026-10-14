// 3D bin-packing engine (extreme-point-pivot heuristic, in the spirit of
// py3dbp) with two physical constraints layered on top that a generic bin
// packer doesn't enforce by default:
//
//  1. Height stays vertical. A box may only be rotated 90 degrees around the
//     vertical axis (its length/width footprint can swap), never tipped onto
//     its side. So each item has exactly 2 valid orientations, not 6.
//  2. Full support only. A box may rest on the container floor, or directly
//     on top of a single other box whose top face fully contains its base
//     (no overhang, no straddling two boxes). A box flagged not-stackable
//     cannot have anything placed on top of it.
//
// Axes are named for what they mean here, not py3dbp's internal width/height/
// depth: x = length (horizontal), y = height (vertical, up), z = width
// (horizontal).

export type Vec3 = [number, number, number];

const EPS = 1e-6;

export class Item {
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  stackable: boolean;
  /** How many units share this item's cargo row - the biggest group loads
   *  first, so it fills whole containers, before smaller groups get tried
   *  against whatever floor/stack space that leaves behind. */
  groupSize: number;
  /** 0 = footprint is (length, width); 1 = footprint is (width, length). */
  orientation: 0 | 1 = 0;
  /** Which orientation to try FIRST at any given candidate spot, for this
   *  item's cargo row - determined once per row by actually simulating a
   *  single-type fill both ways (see orientationAnalysis.ts) and keeping
   *  whichever packed denser. The other orientation is still tried as a
   *  fallback if the preferred one doesn't fit at a given spot. */
  preferredOrientation: 0 | 1;
  position: Vec3 = [0, 0, 0];

  constructor(name: string, length: number, width: number, height: number, weight: number, stackable: boolean, groupSize: number, preferredOrientation: 0 | 1 = 0) {
    this.name = name;
    this.length = length;
    this.width = width;
    this.height = height;
    this.weight = weight;
    this.stackable = stackable;
    this.groupSize = groupSize;
    this.preferredOrientation = preferredOrientation;
  }

  getVolume(): number {
    return this.length * this.width * this.height;
  }

  /** [x-extent, y-extent, z-extent] for the current orientation. */
  getDimension(): Vec3 {
    const [fx, fz] = this.orientation === 0 ? [this.length, this.width] : [this.width, this.length];
    return [fx, this.height, fz];
  }
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 - EPS && b0 < a1 - EPS;
}

function boxesIntersect(a: Item, b: Item): boolean {
  const [ax, ay, az] = a.getDimension();
  const [bx, by, bz] = b.getDimension();
  return (
    rangesOverlap(a.position[0], a.position[0] + ax, b.position[0], b.position[0] + bx) &&
    rangesOverlap(a.position[1], a.position[1] + ay, b.position[1], b.position[1] + by) &&
    rangesOverlap(a.position[2], a.position[2] + az, b.position[2], b.position[2] + bz)
  );
}

/** Is [a0,a1] fully inside [b0,b1] (with a little slack for float error)? */
function within(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 >= b0 - EPS && a1 <= b1 + EPS;
}

export class Bin {
  name: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  items: Item[] = [];

  constructor(name: string, length: number, width: number, height: number, maxWeight: number) {
    this.name = name;
    this.length = length;
    this.width = width;
    this.height = height;
    this.maxWeight = maxWeight;
  }

  getVolume(): number {
    return this.length * this.width * this.height;
  }

  getTotalWeight(): number {
    return this.items.reduce((sum, item) => sum + item.weight, 0);
  }

  /** Does `support` fully carry a box of dimensions `itemDim` sitting at `pivot`, top-face touching? */
  private fullySupportedBy(support: Item, pivot: Vec3, itemDim: Vec3): boolean {
    const [sx, sy, sz] = support.getDimension();
    const supportTopY = support.position[1] + sy;
    if (Math.abs(supportTopY - pivot[1]) > EPS) return false;
    if (!support.stackable) return false;

    const supX0 = support.position[0], supX1 = support.position[0] + sx;
    const supZ0 = support.position[2], supZ1 = support.position[2] + sz;
    const itemX0 = pivot[0], itemX1 = pivot[0] + itemDim[0];
    const itemZ0 = pivot[2], itemZ1 = pivot[2] + itemDim[2];

    return within(itemX0, itemX1, supX0, supX1) && within(itemZ0, itemZ1, supZ0, supZ1);
  }

  putItem(item: Item, pivot: Vec3): boolean {
    const validItemPosition = item.position;
    item.position = pivot;

    const tryOrder: (0 | 1)[] = item.preferredOrientation === 1 ? [1, 0] : [0, 1];
    for (const orientation of tryOrder) {
      item.orientation = orientation;
      const dimension = item.getDimension();

      if (
        this.length < pivot[0] + dimension[0] ||
        this.height < pivot[1] + dimension[1] ||
        this.width < pivot[2] + dimension[2]
      ) {
        continue;
      }

      // Resting on the floor is always supported; resting above the floor
      // requires one existing box directly beneath whose top face fully
      // contains this item's base.
      if (pivot[1] > EPS) {
        const supported = this.items.some((existing) => this.fullySupportedBy(existing, pivot, dimension));
        if (!supported) continue;
      }

      let collides = false;
      for (const current of this.items) {
        if (boxesIntersect(current, item)) {
          collides = true;
          break;
        }
      }
      if (collides) continue;

      if (this.getTotalWeight() + item.weight > this.maxWeight) {
        item.position = validItemPosition;
        return false;
      }

      this.items.push(item);
      return true;
    }

    item.position = validItemPosition;
    return false;
  }
}

export class Packer {
  bins: Bin[] = [];
  items: Item[] = [];

  addBin(bin: Bin) {
    this.bins.push(bin);
  }

  addItem(item: Item) {
    this.items.push(item);
  }

  /** Returns whether `item` was placed. Called up to twice per item (big-first
   *  pass, then the ascending gap-fill pass) - callers manage the item pool. */
  private packToBin(bin: Bin, item: Item): boolean {
    if (bin.items.length === 0) {
      return bin.putItem(item, [0, 0, 0]);
    }

    // Try filling out the floor completely - next along length, then next
    // along width - before stacking anything on top. Stacking first (the old
    // order) builds a tower in one strip while whole rows of floor sit empty,
    // which is exactly backwards from how a container actually gets loaded.
    const axisOrder = [0, 2, 1] as const; // length, width, then on-top
    for (const axis of axisOrder) {
      for (const ib of bin.items) {
        const [fx, fy, fz] = ib.getDimension();
        let pivot: Vec3 = [0, 0, 0];
        if (axis === 0) pivot = [ib.position[0] + fx, ib.position[1], ib.position[2]]; // next along length
        else if (axis === 1) pivot = [ib.position[0], ib.position[1] + fy, ib.position[2]]; // stacked on top
        else pivot = [ib.position[0], ib.position[1], ib.position[2] + fz]; // next along width

        if (bin.putItem(item, pivot)) return true;
      }
    }

    return false;
  }

  pack(biggerFirst = false, distributeItems = false) {
    this.bins.sort((a, b) => (biggerFirst ? b.getVolume() - a.getVolume() : a.getVolume() - b.getVolume()));
    // Primary key: which cargo row has the most units - that group loads
    // first and fills whole containers by itself. Only once it's placed do
    // smaller-quantity rows get tried, against the gaps the big group left
    // behind. Volume is just the tiebreaker within equal-sized groups.
    this.items.sort((a, b) => {
      if (biggerFirst) return b.groupSize - a.groupSize || b.getVolume() - a.getVolume();
      return a.groupSize - b.groupSize || a.getVolume() - b.getVolume();
    });

    for (const bin of this.bins) {
      // Pass 1: every remaining item, biggest group first - this is what
      // actually builds the layout (the dominant cargo type creates the
      // pivots/gaps everything else fills into).
      for (const item of this.items) {
        this.packToBin(bin, item);
      }
      if (distributeItems) {
        const placedNames = new Set(bin.items.map((i) => i.name));
        this.items = this.items.filter((i) => !placedNames.has(i.name));
      }

      // Pass 2: gap-fill. Whatever didn't fit in pass 1 gets a second try
      // against this same bin, smallest first - small leftover items (of any
      // cargo type) are exactly what's able to slot into the odd-shaped gaps
      // that pass 1's big-item layout leaves behind.
      const gapFillCandidates = [...this.items].sort((a, b) => a.getVolume() - b.getVolume());
      for (const item of gapFillCandidates) {
        this.packToBin(bin, item);
      }
      if (distributeItems) {
        const placedNames = new Set(bin.items.map((i) => i.name));
        this.items = this.items.filter((i) => !placedNames.has(i.name));
      }
    }
  }
}

import { jsPDF } from "jspdf";
import type { BinResult, PackResponse, PlacedBox } from "../types";
import { colorForName } from "./colors";
import { renderContainerToDataUrl } from "./renderContainerImage";

const PAGE_W = 842; // A4 landscape, pt
const PAGE_H = 595;
const MARGIN = 36;

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

const CM3_PER_CFT = 28316.846592;

interface ViewSpec {
  title: string;
  /** Horizontal/vertical extents of the drawing plane, in cm. */
  planeW: number;
  planeH: number;
  boxes: { rectX: number; rectY: number; rectW: number; rectH: number; box: PlacedBox }[];
  /** Label + how many cm of reach the cargo actually uses along each axis,
   *  measured from 0 - e.g. "Length" 480 used of a 590 plane means cargo
   *  reaches 480cm in and the remaining 110cm is empty. Centimeters, not
   *  percentages - the plain numbers people actually load against. */
  axis1Name: string;
  axis1Used: number;
  axis2Name: string;
  axis2Used: number;
}

/** Small tick + label marking where "used" ends and "left" begins, drawn
 *  just outside the diagram border - a lightweight dimension line. */
function drawAxisTick(doc: jsPDF, spec: ViewSpec, offX: number, offY: number, drawH: number, scale: number) {
  const usedLen = Math.min(spec.axis1Used, spec.planeW);
  const leftLen = spec.planeW - usedLen;
  const tickX = offX + usedLen * scale;
  doc.setDrawColor(200, 60, 60);
  doc.setLineWidth(1);
  doc.line(tickX, offY + drawH, tickX, offY + drawH + 6);
  doc.setFontSize(7.5);
  doc.setTextColor(150, 40, 40);
  const usedMidX = offX + (usedLen * scale) / 2;
  const leftMidX = tickX + (leftLen * scale) / 2;
  if (usedLen * scale > 34) doc.text(`${usedLen.toFixed(0)}cm`, usedMidX, offY + drawH + 14, { align: "center" });
  if (leftLen * scale > 34) doc.text(`${leftLen.toFixed(0)}cm`, leftMidX, offY + drawH + 14, { align: "center" });

  const usedHt = Math.min(spec.axis2Used, spec.planeH);
  const leftHt = spec.planeH - usedHt;
  const tickY = offY + drawH - usedHt * scale;
  doc.line(offX - 6, tickY, offX, tickY);
  if (usedHt * scale > 20) {
    doc.text(`${usedHt.toFixed(0)}`, offX - 8, (tickY + offY + drawH) / 2 + 2, { align: "right" });
  }
  if (leftHt * scale > 20) {
    doc.text(`${leftHt.toFixed(0)}`, offX - 8, (offY + tickY) / 2 + 2, { align: "right" });
  }
}

function drawView(doc: jsPDF, spec: ViewSpec, x: number, y: number, w: number, h: number, allNames: string[]) {
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`${spec.title}  (${spec.planeW.toFixed(0)} x ${spec.planeH.toFixed(0)} cm)`, x, y - 16);
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  const axis1Left = Math.max(0, spec.planeW - spec.axis1Used);
  const axis2Left = Math.max(0, spec.planeH - spec.axis2Used);
  doc.text(
    `${spec.axis1Name}: ${spec.axis1Used.toFixed(0)}cm used, ${axis1Left.toFixed(0)}cm left (of ${spec.planeW.toFixed(0)}cm)` +
    `   •   ${spec.axis2Name}: ${spec.axis2Used.toFixed(0)}cm used, ${axis2Left.toFixed(0)}cm left (of ${spec.planeH.toFixed(0)}cm)`,
    x, y - 4
  );

  if (spec.planeW <= 0 || spec.planeH <= 0) return;
  // Reserve a small gutter left/below the diagram for the dimension ticks.
  const gutterL = 16, gutterB = 16;
  const availW = w - gutterL, availH = h - gutterB;
  const scale = Math.min(availW / spec.planeW, availH / spec.planeH);
  const drawW = spec.planeW * scale;
  const drawH = spec.planeH * scale;
  const offX = x + gutterL + (availW - drawW) / 2;
  const offY = y + (availH - drawH) / 2;

  // The actual container boundary, at scale - this is what makes leftover
  // empty space readable (a light panel frame alone doesn't show it, since
  // it isn't proportional to the container's real dimensions).
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(1.3);
  doc.rect(offX, offY, drawW, drawH, "FD");
  doc.setLineWidth(1);

  for (const { rectX, rectY, rectW, rectH, box } of spec.boxes) {
    const px = offX + rectX * scale;
    // Flip vertical: our plane's "up" (larger value) should draw near the top of the box.
    const py = offY + drawH - (rectY + rectH) * scale;
    const pw = rectW * scale;
    const ph = rectH * scale;

    const [r, g, b] = hexToRgb(colorForName(box.cargo_name, allNames));
    doc.setFillColor(r, g, b);
    doc.setDrawColor(40, 40, 40);
    doc.rect(px, py, pw, ph, "FD");

    if (pw > 9 && ph > 7) {
      const fontSize = Math.max(5, Math.min(8, Math.min(pw, ph) * 0.5));
      doc.setFontSize(fontSize);
      doc.setTextColor(20, 20, 20);
      doc.text(String(box.unit_number), px + pw / 2, py + ph / 2 + fontSize * 0.32, { align: "center" });
    }
  }

  drawAxisTick(doc, spec, offX, offY, drawH, scale);
}

/** How far cargo actually reaches along an axis, in cm, measured from 0 -
 *  e.g. maxReach of (x, x+length) pairs tells you "cargo goes this far down
 *  the length of the container, the rest is empty." */
function maxReach(pairs: { start: number; end: number }[]): number {
  return pairs.reduce((max, p) => Math.max(max, p.end), 0);
}

function buildViewsForBin(bin: BinResult, container: { length_cm: number; width_cm: number; height_cm: number }): {
  top: ViewSpec; side: ViewSpec; bottom: ViewSpec;
} {
  const { length_cm: L, width_cm: W, height_cm: H } = container;

  // Top view: looking straight down. Draw floor-to-ceiling boxes sorted by
  // height ascending so higher (later-drawn) boxes visually sit on top of
  // whatever is beneath them, matching what a top-down look would show.
  const topSorted = [...bin.placed_boxes].sort((a, b) => a.y - b.y);
  const top: ViewSpec = {
    title: "Top View",
    planeW: L,
    planeH: W,
    boxes: topSorted.map((box) => ({ rectX: box.x, rectY: box.z, rectW: box.length, rectH: box.width, box })),
    axis1Name: "Length", axis1Used: maxReach(bin.placed_boxes.map((b) => ({ start: b.x, end: b.x + b.length }))),
    axis2Name: "Width", axis2Used: maxReach(bin.placed_boxes.map((b) => ({ start: b.z, end: b.z + b.width }))),
  };

  // Side view: looking along the width axis. Boxes further back (larger z)
  // drawn first so nearer boxes (smaller z) are painted on top.
  const sideSorted = [...bin.placed_boxes].sort((a, b) => b.z - a.z);
  const side: ViewSpec = {
    title: "Side View",
    planeW: L,
    planeH: H,
    boxes: sideSorted.map((box) => ({ rectX: box.x, rectY: box.y, rectW: box.length, rectH: box.height, box })),
    axis1Name: "Length", axis1Used: maxReach(bin.placed_boxes.map((b) => ({ start: b.x, end: b.x + b.length }))),
    axis2Name: "Height", axis2Used: maxReach(bin.placed_boxes.map((b) => ({ start: b.y, end: b.y + b.height }))),
  };

  // Bottom view / floor plan: only boxes actually resting on the container floor.
  const floorBoxes = bin.placed_boxes.filter((box) => box.y < 1e-3);
  const bottom: ViewSpec = {
    title: "Bottom View / Floor Plan",
    planeW: L,
    planeH: W,
    boxes: floorBoxes.map((box) => ({ rectX: box.x, rectY: box.z, rectW: box.length, rectH: box.width, box })),
    axis1Name: "Length", axis1Used: maxReach(floorBoxes.map((b) => ({ start: b.x, end: b.x + b.length }))),
    axis2Name: "Width", axis2Used: maxReach(floorBoxes.map((b) => ({ start: b.z, end: b.z + b.width }))),
  };

  return { top, side, bottom };
}

function drawLegendAndTable(
  doc: jsPDF,
  bin: BinResult,
  allNames: string[],
  x: number,
  y: number,
  w: number
) {
  const perName = new Map<string, { type: string; count: number; min: number; max: number }>();
  for (const box of bin.placed_boxes) {
    const entry = perName.get(box.cargo_name);
    if (!entry) {
      perName.set(box.cargo_name, { type: box.cargo_type, count: 1, min: box.unit_number, max: box.unit_number });
    } else {
      entry.count += 1;
      entry.min = Math.min(entry.min, box.unit_number);
      entry.max = Math.max(entry.max, box.unit_number);
    }
  }

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Cargo in this container", x, y);

  const headerY = y + 14;
  const colName = x, colCount = x + w * 0.45, colRange = x + w * 0.62;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Name / Type", colName, headerY);
  doc.text("Qty", colCount, headerY);
  doc.text("Unit #s", colRange, headerY);

  const firstRowY = headerY + 12;
  const available = PAGE_H - MARGIN - firstRowY;
  const rowSpacing = Math.max(9, Math.min(13, perName.size > 0 ? available / perName.size : 13));
  const fontSize = rowSpacing >= 11 ? 8 : 6.5;

  let rowY = firstRowY;
  for (const [name, info] of perName) {
    if (rowY > PAGE_H - MARGIN) break; // extreme cargo-type counts: keep it on one page rather than overflow
    const [r, g, b] = hexToRgb(colorForName(name, allNames));
    doc.setFillColor(r, g, b);
    doc.setDrawColor(40, 40, 40);
    doc.rect(colName, rowY - fontSize, fontSize, fontSize, "FD");
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 30, 30);
    doc.text(`${name} (${info.type})`, colName + fontSize + 4, rowY);
    doc.text(String(info.count), colCount, rowY);
    doc.text(`#${info.min}-#${info.max}`, colRange, rowY);
    rowY += rowSpacing;
  }
}

export function exportPackingPdf(pack: PackResponse) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const allNames = pack.cargo_summary.map((c) => c.name);

  // Cover / summary page.
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("Loading Simulation Report", MARGIN, MARGIN + 10);
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(`Container type: ${pack.container_name}`, MARGIN, MARGIN + 34);
  doc.text(
    `${pack.container_dims.length_cm} x ${pack.container_dims.width_cm} x ${pack.container_dims.height_cm} cm, max ${pack.container_dims.max_weight_kg} kg`,
    MARGIN, MARGIN + 50
  );
  doc.text(`Containers needed: ${pack.containers_used}`, MARGIN, MARGIN + 72);
  doc.text(`Volume utilization: ${pack.total_volume_utilization_pct}%`, MARGIN, MARGIN + 88);
  doc.text(`Weight utilization: ${pack.total_weight_utilization_pct}%`, MARGIN, MARGIN + 104);

  let sumY = MARGIN + 134;
  doc.setFontSize(12);
  doc.text("Cargo Summary", MARGIN, sumY);
  sumY += 18;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Name", MARGIN, sumY);
  doc.text("Type", MARGIN + 200, sumY);
  doc.text("Requested", MARGIN + 360, sumY);
  doc.text("Fitted", MARGIN + 440, sumY);
  doc.text("Leftover", MARGIN + 500, sumY);
  sumY += 14;
  for (const c of pack.cargo_summary) {
    if (sumY > PAGE_H - MARGIN) break;
    const [r, g, b] = hexToRgb(colorForName(c.name, allNames));
    doc.setFillColor(r, g, b);
    doc.rect(MARGIN, sumY - 8, 8, 8, "F");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(c.name, MARGIN + 12, sumY);
    doc.text(c.cargo_type, MARGIN + 200, sumY);
    doc.text(String(c.requested_qty), MARGIN + 360, sumY);
    doc.text(String(c.fitted_qty), MARGIN + 440, sumY);
    doc.text(String(c.leftover_qty), MARGIN + 500, sumY);
    sumY += 16;
  }
  if (pack.warnings.length) {
    sumY += 8;
    doc.setFontSize(9);
    doc.setTextColor(180, 100, 20);
    for (const warn of pack.warnings) {
      if (sumY > PAGE_H - MARGIN) break;
      doc.text(`* ${warn}`, MARGIN, sumY);
      sumY += 13;
    }
  }

  // One page per container: top / side / bottom views + legend table.
  for (const bin of pack.bins) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text(`Container ${bin.bin_index} of ${pack.bins.length} — ${pack.container_name}`, MARGIN, MARGIN);
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(`Volume used: ${bin.volume_used_pct}%   Weight used: ${bin.weight_used_pct}%`, MARGIN, MARGIN + 16);

    const containerCft = (pack.container_dims.length_cm * pack.container_dims.width_cm * pack.container_dims.height_cm) / CM3_PER_CFT;
    const usedVolumeCm3 = bin.placed_boxes.reduce((s, b) => s + b.length * b.width * b.height, 0);
    const usedCft = usedVolumeCm3 / CM3_PER_CFT;
    const usedWeightKg = bin.placed_boxes.reduce((s, b) => s + b.weight, 0);
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `CFT: ${usedCft.toFixed(1)} used of ${containerCft.toFixed(1)} (${(containerCft - usedCft).toFixed(1)} CFT free)   •   ` +
      `Weight: ${usedWeightKg.toFixed(0)} kg of ${pack.container_dims.max_weight_kg.toFixed(0)} kg   •   ` +
      `Boxes placed: ${bin.placed_boxes.length}`,
      MARGIN, MARGIN + 32
    );

    const { top, side, bottom } = buildViewsForBin(bin, pack.container_dims);

    // Left column: the 3D corner view (the primary "what does this actually
    // look like" view). Right column: the three flat reference views, smaller.
    const usableW = PAGE_W - MARGIN * 2;
    const viewsTop = MARGIN + 52;
    const colGap = 16;
    const leftW = usableW * 0.42;
    const rightX = MARGIN + leftW + colGap;
    const rightW = usableW - leftW - colGap;

    const isoTitleGap = 16;
    const isoH = 290;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("3D View", MARGIN, viewsTop + isoTitleGap - 4);
    doc.setDrawColor(180, 180, 180);
    doc.rect(MARGIN, viewsTop + isoTitleGap, leftW, isoH);
    const renderScale = 2.2; // supersample for print crispness
    const imgDataUrl = renderContainerToDataUrl(
      pack.container_dims, bin.placed_boxes, allNames,
      Math.round(leftW * renderScale), Math.round(isoH * renderScale)
    );
    doc.addImage(imgDataUrl, "PNG", MARGIN, viewsTop + isoTitleGap, leftW, isoH);
    const leftBottom = viewsTop + isoTitleGap + isoH;

    const flatTitleGap = 26;
    const flatViewH = 74;
    const flatGap = 10;
    let vy = viewsTop;
    drawView(doc, top, rightX, vy + flatTitleGap, rightW, flatViewH, allNames);
    vy += flatTitleGap + flatViewH + flatGap;
    drawView(doc, side, rightX, vy + flatTitleGap, rightW, flatViewH, allNames);
    vy += flatTitleGap + flatViewH + flatGap;
    drawView(doc, bottom, rightX, vy + flatTitleGap, rightW, flatViewH, allNames);
    vy += flatTitleGap + flatViewH;
    const rightBottom = vy;

    const legendY = Math.max(leftBottom, rightBottom) + 22;
    drawLegendAndTable(doc, bin, allNames, MARGIN, legendY, usableW);
  }

  doc.save("loading-simulation-report.pdf");
}

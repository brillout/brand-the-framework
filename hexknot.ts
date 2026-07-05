/**
 * hexknot.ts — parametric generator for the interlocking-hexagon mark.
 *
 * How the shape works
 * -------------------
 * The logo is a single 8-cornered "band" stamped six times, each copy rotated
 * 60° about the center. Every edge of that band lies on a line whose direction
 * is one of the three edge directions of a regular hexagon, so the band is
 * fully described by 8 (normal angle, signed distance from center) pairs and
 * its corners fall out as line/line intersections. Four distances drive
 * everything:
 *
 *   a = size / 2       outer apothem (center -> flat outer side)
 *   t = lineWidth      band thickness
 *   v = holeSize / 2   apothem of the central opening
 *   g = gap            white gap where a band tucks under its neighbor
 *
 * Run:     npx tsx hexknot.ts [out.svg] [--param=value ...]
 * Example: npx tsx hexknot.ts logo.svg --lineWidth=30 --holeSize=209
 * Import:  import { hexKnotSvg } from "./hexknot";
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ------------------------------------------------------------------ options

export interface HexKnotParams {
  /** Overall width of the hexagon, flat side to flat side. (Total height = size / cos 30° ≈ 1.155 × size.) */
  size?: number;
  /** Thickness of the bands. */
  lineWidth?: number;
  /** White gap where one band passes under another. */
  gap?: number;
  /** Width of the central opening, flat side to flat side. */
  holeSize?: number;
  /** Margin between the artwork and the edge of the viewBox. */
  padding?: number;
  /** Fill color of the bands. */
  color?: string;
  /** Background color; keep null for transparent. */
  background?: string | null;
  /** Decimal places used for coordinates in the output. */
  precision?: number;
}

/** Defaults reproduce the original mark. */
export const DEFAULTS: Required<HexKnotParams> = {
  size: 512,
  lineWidth: 45,
  gap: 23,
  holeSize: 179,
  padding: 26,
  color: "#333333",
  background: null,
  precision: 1,
};

type Resolved = Required<HexKnotParams>;

// ----------------------------------------------------------------- geometry

type Vec = readonly [number, number];

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Unit vector at `deg` degrees. SVG coordinates: y grows downward. */
const unit = (deg: number): Vec => [Math.cos(rad(deg)), Math.sin(rad(deg))];

/** An infinite line { p : n·p = o } — unit normal `n`, signed distance `o` from the origin. */
interface Line {
  readonly n: Vec;
  readonly o: number;
}

const line = (normalDeg: number, o: number): Line => ({ n: unit(normalDeg), o });

/** Point where two non-parallel lines cross. */
function intersect(a: Line, b: Line): Vec {
  const det = a.n[0] * b.n[1] - a.n[1] * b.n[0];
  if (Math.abs(det) < 1e-9) throw new Error("Degenerate geometry: consecutive edges are parallel.");
  return [
    (a.o * b.n[1] - b.o * a.n[1]) / det,
    (a.n[0] * b.o - b.n[0] * a.o) / det,
  ];
}

// ------------------------------------------------------ the band, as lines

/**
 * Edge lines of one band, in drawing order. Regular-hexagon edge normals sit
 * at multiples of 60°; this band hugs the upper-left (240°) and left (180°)
 * sides of the hexagon, then dives across the middle parallel to the
 * lower-left (120°) side. The five other bands are rotated copies.
 */
function bandEdges(p: Resolved): Line[] {
  const a = p.size / 2;
  const t = p.lineWidth;
  const v = p.holeSize / 2;
  const g = p.gap;
  return [
    line(240, a), //          outer face, upper-left side of the hexagon
    line(180, a), //          outer face, left side of the hexagon
    line(120, v + t), //      diagonal stroke, face away from the hole
    line(60, v - g), //       angled cut at the diagonal's tip
    line(120, v), //          diagonal stroke, face that forms the hole
    line(180, a - t), //      left side, inner face
    line(240, a - t), //      upper-left side, inner face
    line(180, v + t + g), //  cut where the band emerges from under its neighbor
  ];
}

/** Corners of the band: consecutive edge lines, intersected pairwise. */
const corners = (edges: Line[]): Vec[] =>
  edges.map((edge, i) => intersect(edges[(i + edges.length - 1) % edges.length], edge));

/** Loud warnings for parameter combinations that break the design. */
function validate(p: Resolved): void {
  const a = p.size / 2;
  const v = p.holeSize / 2;
  const problems: Array<[boolean, string]> = [
    [p.size <= 0 || p.lineWidth <= 0 || p.holeSize <= 0 || p.gap < 0,
      "size, lineWidth and holeSize must be positive; gap must be >= 0"],
    [v <= p.gap,
      "holeSize/2 must exceed gap, or the stroke tips collide in the center"],
    [a - p.lineWidth <= v + p.lineWidth + p.gap,
      "no room between outer sides and the hole — lower lineWidth/holeSize/gap or raise size"],
  ];
  for (const [bad, msg] of problems) if (bad) console.warn(`[hexknot] warning: ${msg}`);
}

// --------------------------------------------------------------- svg output

export function hexKnotSvg(params: HexKnotParams = {}): string {
  const p: Resolved = { ...DEFAULTS, ...params };
  validate(p);

  const fmt = (n: number): string => {
    const s = n.toFixed(p.precision);
    const trimmed = p.precision ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
    return trimmed === "-0" ? "0" : trimmed;
  };

  const d =
    corners(bandEdges(p))
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`)
      .join(" ") + " Z";

  // Everything is drawn around (0,0), so the rotations need no explicit
  // center and the viewBox is symmetric about the origin.
  const halfW = p.size / 2 + p.padding;
  const halfH = p.size / (2 * Math.cos(rad(30))) + p.padding;
  const [x, y, w, h] = [-halfW, -halfH, 2 * halfW, 2 * halfH].map(fmt);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">`,
    ...(p.background
      ? [`  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.background}"/>`]
      : []),
    `  <path id="band" fill="${p.color}" d="${d}"/>`,
    ...[60, 120, 180, 240, 300].map(a => `  <use href="#band" transform="rotate(${a})"/>`),
    `</svg>`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------- cli

function parseArgs(argv: string[]): { out: string; params: HexKnotParams } {
  const params: HexKnotParams = {};
  let out = "hexknot.svg";

  for (const arg of argv) {
    const match = /^--([A-Za-z]+)=(.+)$/.exec(arg);
    if (!match) {
      out = arg;
      continue;
    }
    const [, key, raw] = match;
    if (!(key in DEFAULTS)) {
      console.warn(`[hexknot] ignoring unknown option --${key} (known: ${Object.keys(DEFAULTS).join(", ")})`);
      continue;
    }
    const numeric = typeof DEFAULTS[key as keyof Resolved] === "number";
    if (numeric && Number.isNaN(Number(raw))) {
      console.warn(`[hexknot] ignoring --${key}: "${raw}" is not a number`);
      continue;
    }
    Object.assign(params, { [key]: numeric ? Number(raw) : raw });
  }
  return { out, params };
}

const isMain = (() => {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch {
    return false;
  }
})();

if (isMain) {
  const { out, params } = parseArgs(process.argv.slice(2));
  const svg = hexKnotSvg(params);
  writeFileSync(out, svg);
  console.log(`[hexknot] wrote ${out} (${svg.length} bytes)`);
}

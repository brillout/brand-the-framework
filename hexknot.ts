/**
 * hexknot.ts — parametric generator for the interlocking-hexagon mark.
 *
 * How the shape works
 * -------------------
 * The logo is a single 8-cornered "band" stamped six times, each copy rotated
 * 60° about the center. Every edge of that band lies on a line whose direction
 * is one of the three edge directions of a regular hexagon, so the band is
 * fully described by 8 (normal angle, signed distance from center) pairs and
 * its corners fall out as line/line intersections. Four distances drive the
 * geometry:
 *
 *   a = size / 2       outer apothem (center -> flat outer side)
 *   t = lineWidth      band thickness
 *   v = holeSize / 2   apothem of the central opening
 *   g = gap            white gap where a band tucks under its neighbor
 *
 * Color
 * -----
 * `colors` takes any number of colors; `gradient` picks how they are applied:
 *   "steps"   (default) every band is ONE solid color. The palette's main
 *             colors are spread evenly around the ring and each band between
 *             two mains carries their solid blend — a stepped gradient. With
 *             3 mains on 6 bands: main, blend, main, blend, main, blend.
 *   "flow"    smooth sweep around the ring (per-band linear gradients).
 *   "linear"  one straight gradient across the whole mark; direction set by
 *             gradientAngle (0 = left→right, 90 = top→bottom, 45 = diagonal).
 * One color (or --color=...) gives the flat mark. "steps" and "flow" blend
 * colors themselves, so they need hex colors (#rgb / #rrggbb).
 *
 * Run:     npx tsx hexknot.ts [out.svg] [--param=value ...]
 * Example: npx tsx hexknot.ts logo.svg --colors=#ff9a00,#e5006d,#3a7bd5
 *          npx tsx hexknot.ts logo.svg --gradient=flow
 *          npx tsx hexknot.ts logo.svg --colors=#333333   (original flat mark)
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
  /** Flat fill color, used when `colors` isn't given. */
  color?: string;
  /** Color palette; 2+ entries color the bands. Takes precedence over `color`. */
  colors?: string[];
  /** How the palette is applied: "steps" (solid bands), "flow" (sweep), "linear" (straight gradient). */
  gradient?: "steps" | "flow" | "linear";
  /** Direction of the "linear" gradient in degrees: 0 = left→right, 90 = top→bottom. */
  gradientAngle?: number;
  /** Background color; keep null for transparent. */
  background?: string | null;
  /** Prefix for element ids, so several generated SVGs can be inlined on one page. */
  idPrefix?: string;
  /** Decimal places used for coordinates in the output. */
  precision?: number;
}

/** Defaults: three main colors, applied as solid stepped bands; `--colors=#333333` restores the flat original. */
export const DEFAULTS: Required<HexKnotParams> = {
  size: 512,
  lineWidth: 48,
  gap: 17,
  holeSize: 240,
  padding: 0,
  color: "#333333",
  background: null,
  precision: 1,
  colors: ["#f72585", "#7209b7", "#4cc9f0"],
  gradient: "steps",
  gradientAngle: 45,
  idPrefix: "hk",
};

type Resolved = Required<HexKnotParams>;

// ----------------------------------------------------------------- geometry

type Vec = readonly [number, number];

const BAND_COUNT = 6;
const ANGLES = Array.from({ length: BAND_COUNT }, (_, k) => (360 / BAND_COUNT) * k);

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Unit vector at `deg` degrees. SVG coordinates: y grows downward. */
const unit = (deg: number): Vec => [Math.cos(rad(deg)), Math.sin(rad(deg))];

const rot = ([x, y]: Vec, deg: number): Vec => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [c * x - s * y, s * x + c * y];
};

const mid = (a: Vec, b: Vec): Vec => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

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

/** Corners of the base band for given params (P0..P7); handy for testing and custom rendering. */
export const bandCorners = (params: HexKnotParams = {}): Vec[] =>
  corners(bandEdges({ ...DEFAULTS, ...params }));

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
    [!["steps", "flow", "linear"].includes(p.gradient),
      `unknown gradient "${p.gradient}" — using "steps" (options: steps, flow, linear)`],
  ];
  for (const [bad, msg] of problems) if (bad) console.warn(`[hexknot] warning: ${msg}`);
}

// -------------------------------------------------------------------- color

type Rgb = readonly [number, number, number];

/** "#rgb" or "#rrggbb" → [r, g, b]; null for anything else. */
export function parseHex(color: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map(ch => ch + ch).join("") : m[1];
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
}

const toHex = (rgb: readonly number[]): string =>
  "#" + rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

/** Sample a palette treated as a closed loop, t ∈ [0, 1] (t = 1 wraps to t = 0). */
export function paletteAt(palette: readonly Rgb[], t: number): string {
  const x = (((t % 1) + 1) % 1) * palette.length;
  const i = Math.floor(x) % palette.length;
  const f = x - Math.floor(x);
  const a = palette[i];
  const b = palette[(i + 1) % palette.length];
  return toHex(a.map((v, ch) => v + (b[ch] - v) * f));
}

// --------------------------------------------------------------- svg output

export function hexKnotSvg(params: HexKnotParams = {}): string {
  const p: Resolved = { ...DEFAULTS, ...params };
  validate(p);

  // `colors` wins over `color`; passing only `color` opts out of the default palette.
  const requested = params.colors ?? (params.color !== undefined ? [params.color] : p.colors);
  const palette = requested.length > 0 ? requested : [p.color];

  const fmt = (n: number): string => {
    const s = n.toFixed(p.precision);
    const trimmed = p.precision ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
    return trimmed === "-0" ? "0" : trimmed;
  };

  const pathEl = (d: string, fill: string): string => `  <path fill="${fill}" d="${d}"/>`;

  const gradientEl = (id: string, [x1, y1]: Vec, [x2, y2]: Vec, stops: Array<[number, string]>): string =>
    [
      `    <linearGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
        `x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}">`,
      ...stops.map(([o, c]) => `      <stop offset="${+o.toFixed(3)}" stop-color="${c}"/>`),
    `    </linearGradient>`,
    ].join("\n");

  // Geometry: the base band and its six rotated copies, rotated in code so the
  // whole file lives in one coordinate space (no transform/paint-server surprises).
  const base = corners(bandEdges(p));
  const bands = ANGLES.map(angle => base.map(pt => rot(pt, angle)));
  const dOf = (poly: Vec[]): string =>
    poly.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`).join(" ") + " Z";

  /** Blending needs hex colors; returns null when the palette can't be blended. */
  const hexPalette = (): Rgb[] | null => {
    const rgb = palette.map(parseHex);
    return rgb.every((c): c is Rgb => c !== null) ? rgb : null;
  };

  /** One path per band, each with its own solid fill. */
  const solidBands = (colorOf: (k: number) => string): string[] =>
    bands.map((band, k) => pathEl(dOf(band), colorOf(k)));

  const defs: string[] = [];
  let body: string[];

  if (palette.length <= 1) {
    // Flat mark: all six bands as subpaths of a single path.
    body = [pathEl(bands.map(dOf).join(" "), palette[0])];
  } else if (p.gradient === "linear") {
    // One straight gradient across the whole mark.
    const id = `${p.idPrefix}-g`;
    const reach = p.size / (2 * Math.cos(rad(30))); // circumradius covers every direction
    const axis = unit(p.gradientAngle);
    defs.push(gradientEl(
      id,
      [-reach * axis[0], -reach * axis[1]],
      [reach * axis[0], reach * axis[1]],
      palette.map((c, i) => [i / (palette.length - 1), c]),
    ));
    body = [pathEl(bands.map(dOf).join(" "), `url(#${id})`)];
  } else if (p.gradient === "flow") {
    // Smooth sweep: band k blends from palette(k/6) to palette((k+1)/6) along
    // its own start→tip axis, so the colors run once around the ring and wrap.
    const rgb = hexPalette();
    if (!rgb) {
      console.warn('[hexknot] warning: gradient "flow" needs hex colors — using solid per-band colors instead');
      body = solidBands(k => palette[k % palette.length]);
    } else {
      const from = mid(base[7], base[0]); // middle of the start cut
      const to = mid(base[3], base[4]); //   middle of the tip cut
      body = bands.map((band, k) => {
        const id = `${p.idPrefix}-g${k}`;
        defs.push(gradientEl(id, rot(from, ANGLES[k]), rot(to, ANGLES[k]), [
          [0, paletteAt(rgb, k / BAND_COUNT)],
          [1, paletteAt(rgb, (k + 1) / BAND_COUNT)],
        ]));
        return pathEl(dOf(band), `url(#${id})`);
      });
    }
  } else {
    // "steps" (default): every band is ONE solid color, sampled from the
    // closed palette loop at the band's position around the ring. Main colors
    // land evenly spaced; each band between two mains gets their solid blend.
    const rgb = hexPalette();
    if (!rgb) {
      console.warn('[hexknot] warning: gradient "steps" blends colors, which needs hex — cycling the palette per band instead');
      body = solidBands(k => palette[k % palette.length]);
    } else {
      body = solidBands(k => paletteAt(rgb, k / BAND_COUNT));
    }
  }

  // Everything is drawn around (0,0), so the viewBox is symmetric about the origin.
  const halfW = p.size / 2 + p.padding;
  const halfH = p.size / (2 * Math.cos(rad(30))) + p.padding;
  const [x, y, w, h] = [-halfW, -halfH, 2 * halfW, 2 * halfH].map(fmt);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">`,
    ...(p.background
      ? [`  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.background}"/>`]
      : []),
    ...(defs.length ? ["  <defs>", ...defs, "  </defs>"] : []),
    ...body,
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
    const template = DEFAULTS[key as keyof Resolved];
    let value: unknown = raw;
    if (Array.isArray(template)) {
      value = raw.split(",").map(s => s.trim()).filter(Boolean);
    } else if (typeof template === "number") {
      if (Number.isNaN(Number(raw))) {
        console.warn(`[hexknot] ignoring --${key}: "${raw}" is not a number`);
        continue;
      }
      value = Number(raw);
    }
    Object.assign(params, { [key]: value });
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

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
 * Where a band runs alongside its neighbor, the space between them is
 * a - 2t - v. `bandGap` sets that space directly — it describes the same
 * degree of freedom as `holeSize` (holeSize = size - 4·lineWidth - 2·bandGap),
 * so passing it derives the hole and takes precedence over `holeSize`.
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
 * Corners
 * -------
 * `cornerRadius` rounds every band corner — the SVG-path equivalent of CSS
 * border-radius (paths have no rx/ry attribute, so each corner is trimmed and
 * bridged with a circular arc). The radius is automatically capped per corner
 * so roundings never overlap on short edges. 0 (default) keeps sharp corners.
 *
 * Import:  import { hexKnotSvg } from "./hexknot";
 * CLI:     cli.ts renders the mark to a file (npx tsx cli.ts logo.svg --param=value ...).
 */

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
  /**
   * Space between neighboring bands where they run side by side. Same degree
   * of freedom as `holeSize` (holeSize = size - 4·lineWidth - 2·bandGap);
   * takes precedence over it.
   */
  bandGap?: number;
  /** Corner rounding radius (the SVG-path equivalent of CSS border-radius). 0 keeps sharp corners. */
  cornerRadius?: number;
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
  /** Receives each warning about parameter combinations that break the design. Default: console.warn. */
  onWarn?: (message: string) => void;
}

// The default parameters live in default.ts — they are the branding in use.
import { DEFAULTS } from "./default.ts";
export { DEFAULTS };

type Resolved = Required<HexKnotParams>;

/**
 * Fill in defaults and reconcile params that describe the same thing twice:
 * - `bandGap` <-> `holeSize` are two views of one degree of freedom: an
 *   explicit `bandGap` derives the hole and wins over `holeSize`; otherwise
 *   `holeSize` (given or default) drives and `bandGap` is derived.
 * - `colors` wins over `color`; passing only `color` opts out of the default
 *   palette. The resolved `colors` is never empty, so it IS the palette.
 */
function resolve(params: HexKnotParams): Resolved {
  const warnToConsole = (message: string): void => console.warn(`[hexknot] warning: ${message}`);
  const p: Resolved = { onWarn: warnToConsole, ...DEFAULTS, ...params };
  if (params.bandGap !== undefined) p.holeSize = p.size - 4 * p.lineWidth - 2 * p.bandGap;
  else p.bandGap = (p.size - 4 * p.lineWidth - p.holeSize) / 2;
  if (params.colors === undefined && params.color !== undefined) p.colors = [params.color];
  if (p.colors.length === 0) p.colors = [p.color];
  return p;
}

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
  return [(a.o * b.n[1] - b.o * a.n[1]) / det, (a.n[0] * b.o - b.n[0] * a.o) / det];
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
  corners(bandEdges(resolve(params)));

/**
 * Rounded corner i of a polygon: the two adjacent edges are trimmed back and
 * bridged by a circular arc. The trim distance is r / tan(θ/2) for interior
 * angle θ, capped at half of either edge so neighboring roundings never
 * overlap; when capped, the arc radius shrinks to match.
 */
interface RoundedCorner {
  /** Where the incoming edge stops (arc start). */
  readonly from: Vec;
  /** Where the outgoing edge resumes (arc end). */
  readonly to: Vec;
  /** Effective arc radius after capping; 0 means keep the corner sharp. */
  readonly r: number;
  /** SVG sweep flag: 1 = clockwise on screen (y grows downward). */
  readonly sweep: 0 | 1;
}

function roundCorner(poly: Vec[], i: number, radius: number): RoundedCorner {
  const pt = poly[i];
  const prev = poly[(i + poly.length - 1) % poly.length];
  const next = poly[(i + 1) % poly.length];
  const sharp: RoundedCorner = { from: pt, to: pt, r: 0, sweep: 1 };

  const d1: Vec = [prev[0] - pt[0], prev[1] - pt[1]];
  const d2: Vec = [next[0] - pt[0], next[1] - pt[1]];
  const l1 = Math.hypot(...d1);
  const l2 = Math.hypot(...d2);
  if (l1 < 1e-9 || l2 < 1e-9) return sharp;
  const u1: Vec = [d1[0] / l1, d1[1] / l1];
  const u2: Vec = [d2[0] / l2, d2[1] / l2];

  const dot = Math.min(1, Math.max(-1, u1[0] * u2[0] + u1[1] * u2[1]));
  const theta = Math.acos(dot); // interior angle at the corner
  if (theta > Math.PI - 1e-6) return sharp; // collinear edges: nothing to round

  const trim = Math.min(radius / Math.tan(theta / 2), l1 / 2, l2 / 2);
  const r = trim * Math.tan(theta / 2);
  if (r < 1e-9) return sharp;

  return {
    from: [pt[0] + u1[0] * trim, pt[1] + u1[1] * trim],
    to: [pt[0] + u2[0] * trim, pt[1] + u2[1] * trim],
    r,
    // Travel direction turns with sign of (-u1) × u2; the arc sweeps the same way.
    sweep: -(u1[0] * u2[1] - u1[1] * u2[0]) > 0 ? 1 : 0,
  };
}

/** Warnings for parameter combinations that break the design, reported through `p.onWarn`. */
function validate(p: Resolved): void {
  const v = p.holeSize / 2;
  const problems: Array<[boolean, string]> = [
    [
      p.size <= 0 || p.lineWidth <= 0 || p.holeSize <= 0 || p.gap < 0,
      "size, lineWidth and holeSize must be positive; gap must be >= 0",
    ],
    [p.cornerRadius < 0, "cornerRadius must be >= 0 — treating it as 0 (sharp corners)"],
    [
      v <= p.gap,
      "holeSize/2 must exceed gap, or the stroke tips collide in the center (a big bandGap shrinks the hole)",
    ],
    [
      p.bandGap <= p.gap,
      "bandGap must exceed gap, or a band collides with the neighbor it runs alongside — raise bandGap/size or lower lineWidth/holeSize/gap",
    ],
    [
      !["steps", "flow", "linear"].includes(p.gradient),
      `unknown gradient "${p.gradient}" — using "steps" (options: steps, flow, linear)`,
    ],
  ];
  for (const [bad, msg] of problems) if (bad) p.onWarn(msg);
}

// -------------------------------------------------------------------- color

type Rgb = readonly [number, number, number];

/** "#rgb" or "#rrggbb" → [r, g, b]; null for anything else. */
export function parseHex(color: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((ch) => ch + ch).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
}

const toHex = (rgb: readonly number[]): string =>
  "#" +
  rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

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
  const p = resolve(params);
  validate(p);
  const palette = p.colors;

  const fmt = (n: number): string => {
    const s = n.toFixed(p.precision);
    const trimmed = p.precision ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
    return trimmed === "-0" ? "0" : trimmed;
  };

  const pathEl = (d: string, fill: string): string => `  <path fill="${fill}" d="${d}"/>`;

  const gradientEl = (
    id: string,
    [x1, y1]: Vec,
    [x2, y2]: Vec,
    stops: Array<[number, string]>,
  ): string =>
    [
      `    <linearGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
        `x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}">`,
      ...stops.map(([o, c]) => `      <stop offset="${+o.toFixed(3)}" stop-color="${c}"/>`),
      `    </linearGradient>`,
    ].join("\n");

  // Geometry: the base band and its six rotated copies, rotated in code so the
  // whole file lives in one coordinate space (no transform/paint-server surprises).
  const base = corners(bandEdges(p));
  const bands = ANGLES.map((angle) => base.map((pt) => rot(pt, angle)));
  const dOf = (poly: Vec[]): string =>
    poly
      .map((_, i) => {
        const { from, to, r, sweep } =
          p.cornerRadius > 0
            ? roundCorner(poly, i, p.cornerRadius)
            : { from: poly[i], to: poly[i], r: 0, sweep: 1 };
        const enter = `${i === 0 ? "M" : "L"}${fmt(from[0])} ${fmt(from[1])}`;
        return r > 0
          ? `${enter} A${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${fmt(to[0])} ${fmt(to[1])}`
          : enter;
      })
      .join(" ") + " Z";

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
    defs.push(
      gradientEl(
        id,
        [-reach * axis[0], -reach * axis[1]],
        [reach * axis[0], reach * axis[1]],
        palette.map((c, i) => [i / (palette.length - 1), c]),
      ),
    );
    body = [pathEl(bands.map(dOf).join(" "), `url(#${id})`)];
  } else {
    // "flow" and "steps" blend colors themselves, which needs a hex palette.
    const parsed = palette.map(parseHex);
    const rgb = parsed.every((c): c is Rgb => c !== null) ? parsed : null;
    if (!rgb) {
      p.onWarn(
        `gradient "${p.gradient}" blends colors, which needs hex — cycling the palette per band instead`,
      );
      body = solidBands((k) => palette[k % palette.length]);
    } else if (p.gradient === "flow") {
      // Smooth sweep: band k blends from palette(k/6) to palette((k+1)/6) along
      // its own start→tip axis, so the colors run once around the ring and wrap.
      const from = mid(base[7], base[0]); // middle of the start cut
      const to = mid(base[3], base[4]); //   middle of the tip cut
      body = bands.map((band, k) => {
        const id = `${p.idPrefix}-g${k}`;
        defs.push(
          gradientEl(id, rot(from, ANGLES[k]), rot(to, ANGLES[k]), [
            [0, paletteAt(rgb, k / BAND_COUNT)],
            [1, paletteAt(rgb, (k + 1) / BAND_COUNT)],
          ]),
        );
        return pathEl(dOf(band), `url(#${id})`);
      });
    } else {
      // "steps" (default): every band is ONE solid color, sampled from the
      // closed palette loop at the band's position around the ring. Main colors
      // land evenly spaced; each band between two mains gets their solid blend.
      body = solidBands((k) => paletteAt(rgb, k / BAND_COUNT));
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

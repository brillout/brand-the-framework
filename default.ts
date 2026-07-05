/**
 * default.ts — the default parameters of the hexknot mark, i.e. the branding
 * actually in use. Tweak values in the playground (pnpm run dev), then record
 * the result here.
 */

import { COLOR_PALETTES } from "./color-palettes.ts";
import type { HexKnotParams } from "./hexknot.ts";

const DEFAULT_PALETTE = COLOR_PALETTES.find((p) => p.name === "Terracotta minimal")!;

/** Defaults: six earthy colors as solid stepped bands; `--colors=#333333` restores the flat original. */
export const DEFAULTS: Required<HexKnotParams> = {
  size: 478,
  lineWidth: 61,
  gap: 6,
  holeSize: 186,
  bandGap: 24, // = (size - 4 * lineWidth - holeSize) / 2 — kept in sync with the values above
  cornerRadius: 10,
  padding: 50,
  color: "#333333",
  background: null,
  precision: 1,
  colors: DEFAULT_PALETTE.colors,
  gradient: "steps",
  gradientAngle: 45,
  idPrefix: "hk",
};

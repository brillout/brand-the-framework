/**
 * default.ts — the default parameters of the hexknot mark, i.e. the branding
 * actually in use. Tweak values in the playground (pnpm run dev), then record
 * the result here.
 */

import { COLOR_PALETTES } from "./color-palettes.ts";
import { bandGapFromHoleSize, type HexKnotParams } from "./hexknot.ts";

const DEFAULT_PALETTE = COLOR_PALETTES.find((p) => p.name === "Everforest");
if (!DEFAULT_PALETTE)
  throw new Error('default palette "Everforest" is missing from color-palettes.ts');

const size = 478;
const lineWidth = 61;
const holeSize = 186;

/** Defaults: the Everforest palette flowing around the ring; `--colors=#333333` restores the flat original. */
export const DEFAULTS: Required<Omit<HexKnotParams, "onWarn">> = {
  size,
  lineWidth,
  gap: 6,
  holeSize,
  bandGap: bandGapFromHoleSize({ size, lineWidth, holeSize }),
  cornerRadius: 10,
  padding: 50,
  background: null,
  precision: 1,
  colors: DEFAULT_PALETTE.colors,
  gradient: "flow",
  gradientAngle: 45,
  idPrefix: "hk",
};

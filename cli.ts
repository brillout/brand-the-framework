/**
 * cli.ts — render the hexknot mark to an SVG file from the command line.
 *
 * Run:     npx tsx cli.ts [out.svg] [--param=value ...]
 * Example: npx tsx cli.ts logo.svg --colors=#ff9a00,#e5006d,#3a7bd5
 *          npx tsx cli.ts logo.svg --gradient=flow
 *          npx tsx cli.ts logo.svg --cornerRadius=8
 *          npx tsx cli.ts logo.svg --bandGap=40
 *          npx tsx cli.ts logo.svg --colors=#333333   (original flat mark)
 */

import { writeFileSync } from "node:fs";
import { DEFAULTS, hexKnotSvg, type HexKnotParams } from "./hexknot.ts";

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
      console.warn(
        `[hexknot] ignoring unknown option --${key} (known: ${Object.keys(DEFAULTS).join(", ")})`,
      );
      continue;
    }
    const template = DEFAULTS[key as keyof typeof DEFAULTS];
    let value: unknown = raw;
    if (Array.isArray(template)) {
      value = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
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

const { out, params } = parseArgs(process.argv.slice(2));
const svg = hexKnotSvg(params);
writeFileSync(out, svg);
console.log(`[hexknot] wrote ${out} (${svg.length} bytes)`);

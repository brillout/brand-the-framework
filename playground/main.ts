/**
 * Interactive playground for hexknot.ts — tweak the mark's parameters with
 * live controls and grab the resulting SVG. Run with: pnpm run playground
 */

import { COLOR_PALETTES, PALETTE_GROUPS } from "../color-palettes.ts";
import {
  bandGapFromHoleSize,
  DEFAULTS,
  hexKnotSvg,
  holeSizeFromBandGap,
  type HexKnotParams,
} from "../hexknot.ts";

// ------------------------------------------------------------------- state

type Gradient = Required<HexKnotParams>["gradient"];

interface State {
  size: number;
  lineWidth: number;
  gap: number;
  holeSize: number;
  bandGap: number;
  cornerRadius: number;
  padding: number;
  precision: number;
  gradient: Gradient;
  gradientAngle: number;
  colors: string[];
  /** null = transparent */
  background: string | null;
}

const stateDefaults: State = {
  size: DEFAULTS.size,
  lineWidth: DEFAULTS.lineWidth,
  gap: DEFAULTS.gap,
  holeSize: DEFAULTS.holeSize,
  bandGap: DEFAULTS.bandGap,
  cornerRadius: DEFAULTS.cornerRadius,
  padding: DEFAULTS.padding,
  precision: DEFAULTS.precision,
  gradient: DEFAULTS.gradient,
  gradientAngle: DEFAULTS.gradientAngle,
  colors: [...DEFAULTS.colors],
  background: DEFAULTS.background,
};

const GRADIENTS: Gradient[] = ["steps", "flow", "linear"];
const NUMERIC_KEYS = [
  "size",
  "lineWidth",
  "gap",
  "holeSize",
  "bandGap",
  "cornerRadius",
  "padding",
  "precision",
  "gradientAngle",
] as const;
type NumericKey = (typeof NUMERIC_KEYS)[number];

const urlState = paramsFromUrl();
const state: State = { ...stateDefaults, colors: [...stateDefaults.colors], ...urlState };
// `bandGap` and `holeSize` describe the same degree of freedom; reconcile
// whichever one the URL left out.
if (urlState.bandGap !== undefined && urlState.holeSize === undefined) {
  state.holeSize = holeSizeFromBandGap(state);
} else {
  state.bandGap = bandGapFromHoleSize(state);
}

// ------------------------------------------------------------- url <-> state

/** Restore state from the query string, so parameter combinations are shareable links. */
function paramsFromUrl(): Partial<State> {
  const query = new URLSearchParams(location.search);
  const partial: Partial<State> = {};
  for (const key of NUMERIC_KEYS) {
    const raw = query.get(key);
    if (raw !== null && !Number.isNaN(Number(raw))) partial[key] = Number(raw);
  }
  const gradient = query.get("gradient");
  if (gradient && GRADIENTS.includes(gradient as Gradient)) partial.gradient = gradient as Gradient;
  const colors = query.get("colors");
  if (colors)
    partial.colors = colors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  if (query.has("background")) partial.background = query.get("background") || null;
  return partial;
}

function syncUrl(): void {
  const query = new URLSearchParams();
  for (const key of NUMERIC_KEYS) {
    if (state[key] !== stateDefaults[key]) query.set(key, String(state[key]));
  }
  if (state.gradient !== stateDefaults.gradient) query.set("gradient", state.gradient);
  if (state.colors.join(",") !== stateDefaults.colors.join(","))
    query.set("colors", state.colors.join(","));
  if (state.background !== stateDefaults.background)
    query.set("background", state.background ?? "");
  const search = query.toString();
  history.replaceState(null, "", search ? `?${search}` : location.pathname);
}

// ---------------------------------------------------------------- controls

const $ = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
};

const controls = $("#controls");

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

interface SliderSpec {
  key: NumericKey;
  min: number;
  max: number;
  /** Sliders whose parameter only matters for one gradient mode get disabled otherwise. */
  onlyFor?: Gradient;
}

const SLIDERS: SliderSpec[] = [
  { key: "size", min: 64, max: 1024 },
  { key: "lineWidth", min: 1, max: 160 },
  { key: "gap", min: 0, max: 80 },
  { key: "holeSize", min: 2, max: 512 },
  { key: "bandGap", min: 0, max: 128 },
  { key: "cornerRadius", min: 0, max: 64 },
  { key: "padding", min: 0, max: 256 },
  { key: "gradientAngle", min: 0, max: 360, onlyFor: "linear" },
  { key: "precision", min: 0, max: 6 },
];

const sliderRows = new Map<NumericKey, HTMLElement>();

function setSliderValue(key: NumericKey, value: number): void {
  state[key] = value;
  for (const input of sliderRows.get(key)!.querySelectorAll("input")) input.value = String(value);
}

/**
 * `bandGap` and `holeSize` are two views of one degree of freedom: editing
 * either recomputes the other, and size/lineWidth edits keep the hole and let
 * `bandGap` follow.
 */
function syncLinkedParams(changed: NumericKey): void {
  if (changed === "bandGap") {
    setSliderValue("holeSize", holeSizeFromBandGap(state));
  } else if (changed === "holeSize" || changed === "size" || changed === "lineWidth") {
    setSliderValue("bandGap", bandGapFromHoleSize(state));
  }
}

for (const spec of SLIDERS) {
  const range = el("input", {
    type: "range",
    min: String(spec.min),
    max: String(spec.max),
    step: "1",
    value: String(state[spec.key]),
  });
  const number = el("input", {
    type: "number",
    min: String(spec.min),
    max: String(spec.max),
    step: "1",
    value: String(state[spec.key]),
  });
  const apply = (raw: string): void => {
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    state[spec.key] = value;
    range.value = raw;
    number.value = raw;
    syncLinkedParams(spec.key);
    render();
  };
  range.addEventListener("input", () => apply(range.value));
  number.addEventListener("input", () => apply(number.value));
  const row = el("label", { class: "control" }, el("span", {}, spec.key), range, number);
  sliderRows.set(spec.key, row);
  controls.append(row);
}

// Gradient mode.
const gradientSelect = el("select", {});
gradientSelect.append(
  ...GRADIENTS.map((g) => el("option", g === state.gradient ? { selected: "" } : {}, g)),
);
gradientSelect.addEventListener("input", () => {
  state.gradient = gradientSelect.value as Gradient;
  render();
});
controls.append(el("label", { class: "control" }, el("span", {}, "gradient"), gradientSelect));

// Color palette: one picker per entry; one entry means the flat mark.
const colorList = el("div", { class: "color-list" });
const addColorButton = el("button", { type: "button", class: "small" }, "+ Add color");
addColorButton.addEventListener("click", () => {
  state.colors.push(state.colors[state.colors.length - 1] ?? DEFAULTS.color);
  rebuildColorList();
  render();
});

function rebuildColorList(): void {
  colorList.replaceChildren(
    ...state.colors.map((color, i) => {
      const picker = el("input", { type: "color", value: color });
      picker.addEventListener("input", () => {
        state.colors[i] = picker.value;
        render();
      });
      const remove = el("button", { type: "button", class: "small", title: "Remove color" }, "×");
      remove.disabled = state.colors.length <= 1;
      remove.addEventListener("click", () => {
        state.colors.splice(i, 1);
        rebuildColorList();
        render();
      });
      return el("div", { class: "color-entry" }, picker, remove);
    }),
    addColorButton,
  );
}
rebuildColorList();
controls.append(
  el("div", { class: "control control-colors" }, el("span", {}, "colors"), colorList),
);

// Background: transparent by default, optional solid color.
const backgroundToggle = el("input", { type: "checkbox" });
backgroundToggle.checked = state.background !== null;
const backgroundPicker = el("input", { type: "color", value: state.background ?? "#ffffff" });
backgroundToggle.addEventListener("input", () => {
  state.background = backgroundToggle.checked ? backgroundPicker.value : null;
  render();
});
backgroundPicker.addEventListener("input", () => {
  backgroundToggle.checked = true;
  state.background = backgroundPicker.value;
  render();
});
controls.append(
  el("div", { class: "control" }, el("span", {}, "background"), backgroundToggle, backgroundPicker),
);

// Preset palettes: clicking one replaces the colors, and the background when
// the palette is designed for its own (dark) backdrop.
const paletteGroups = PALETTE_GROUPS.map((group) =>
  el(
    "div",
    { class: "palette-group" },
    el("h2", {}, group),
    ...COLOR_PALETTES.filter((palette) => palette.group === group).map((palette) => {
      const swatches = el(
        "span",
        {
          class: "palette-swatches",
          style: palette.background ? `background: ${palette.background}` : "",
        },
        ...palette.colors.map((color) => el("span", { style: `background: ${color}` })),
      );
      const button = el("button", { type: "button", class: "palette" }, swatches, palette.name);
      button.addEventListener("click", () => {
        state.colors = [...palette.colors];
        state.background = palette.background ?? null;
        backgroundToggle.checked = state.background !== null;
        if (state.background) backgroundPicker.value = state.background;
        rebuildColorList();
        render();
      });
      return button;
    }),
  ),
);
controls.append(el("div", { class: "palettes" }, ...paletteGroups));

// ----------------------------------------------------------------- actions

$("#reset").addEventListener("click", () => {
  Object.assign(state, stateDefaults, { colors: [...stateDefaults.colors] });
  for (const spec of SLIDERS) {
    const row = sliderRows.get(spec.key)!;
    for (const input of row.querySelectorAll("input")) input.value = String(state[spec.key]);
  }
  gradientSelect.value = state.gradient;
  backgroundToggle.checked = state.background !== null;
  rebuildColorList();
  render();
});

$("#copy").addEventListener("click", async (event) => {
  await navigator.clipboard.writeText(currentSvg);
  const button = event.currentTarget as HTMLButtonElement;
  button.textContent = "Copied!";
  setTimeout(() => (button.textContent = "Copy SVG"), 1200);
});

$("#download").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([currentSvg], { type: "image/svg+xml" }));
  const link = el("a", { href: url, download: "hexknot.svg" });
  link.click();
  URL.revokeObjectURL(url);
});

// ------------------------------------------------------------------ render

const preview = $("#preview");
const source = $("#source");
const byteCount = $("#byte-count");
const warningsBox = $("#warnings");
const favicon = $<HTMLLinkElement>('link[rel="icon"]');

let currentSvg = "";

function render(): void {
  const warnings: string[] = [];
  const params: HexKnotParams = {
    size: state.size,
    lineWidth: state.lineWidth,
    gap: state.gap,
    holeSize: state.holeSize,
    bandGap: state.bandGap,
    cornerRadius: state.cornerRadius,
    padding: state.padding,
    precision: state.precision,
    gradient: state.gradient,
    gradientAngle: state.gradientAngle,
    colors: state.colors,
    background: state.background,
    onWarn: (message) => warnings.push(message),
  };

  try {
    currentSvg = hexKnotSvg(params);
    preview.innerHTML = currentSvg;
    source.textContent = currentSvg;
    byteCount.textContent = `(${currentSvg.length} bytes)`;
    favicon.href = `data:image/svg+xml,${encodeURIComponent(currentSvg)}`;
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  warningsBox.hidden = warnings.length === 0;
  warningsBox.replaceChildren(...warnings.map((w) => el("p", {}, w)));

  for (const spec of SLIDERS) {
    if (spec.onlyFor) {
      sliderRows.get(spec.key)!.classList.toggle("inactive", state.gradient !== spec.onlyFor);
    }
  }

  syncUrl();
}

render();

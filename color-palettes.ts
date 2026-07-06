/**
 * Curated color palettes for the hexknot mark — pass a palette's `colors` (and
 * `background`, when the palette wants its dark backdrop) to hexknot.ts, e.g.:
 *
 *   npx tsx cli.ts logo.svg --colors=#eb6f92,#f6c177,#ebbcba,#31748f,#9ccfd8,#c4a7e7 --background=#191724
 */

export interface ColorPalette {
  name: string;
  group: PaletteGroup;
  colors: string[];
  /** Backdrop the palette is designed for; omitted = transparent. */
  background?: string;
}

export type PaletteGroup = (typeof PALETTE_GROUPS)[number];

export const PALETTE_GROUPS = [
  // Accent colors on their native dark backgrounds.
  "Editor themes",
  "Designer & system",
  // Warm earthy clay tones, spun off from the Terracotta palette.
  "Terracotta",
  // Six shades of one color — the most minimal of the bunch.
  "Single-hue ramps",
  // Two colors alternating around the knot — no blends, like Bauhaus.
  "Duotone",
  // Grays with a single color doing the talking.
  "Minimal accent",
] as const;

/** Two colors repeated so they alternate around the knot instead of blending. */
function duotone(name: string, a: string, b: string, background?: string): ColorPalette {
  return { name, group: "Duotone", colors: [a, b, a, b, a, b], ...(background && { background }) };
}

export const COLOR_PALETTES: ColorPalette[] = [
  // ------------------------------------------------------------ editor themes
  {
    name: "Nord",
    group: "Editor themes",
    colors: ["#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#88c0d0", "#b48ead"],
    background: "#2e3440",
  },
  {
    name: "Catppuccin Mocha",
    group: "Editor themes",
    colors: ["#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#89b4fa", "#cba6f7"],
    background: "#1e1e2e",
  },
  {
    name: "Dracula",
    group: "Editor themes",
    colors: ["#ff5555", "#ffb86c", "#f1fa8c", "#50fa7b", "#8be9fd", "#bd93f9"],
    background: "#282a36",
  },
  {
    name: "Tokyo Night",
    group: "Editor themes",
    colors: ["#f7768e", "#ff9e64", "#e0af68", "#9ece6a", "#7dcfff", "#bb9af7"],
    background: "#1a1b26",
  },
  {
    name: "Rosé Pine",
    group: "Editor themes",
    colors: ["#eb6f92", "#f6c177", "#ebbcba", "#31748f", "#9ccfd8", "#c4a7e7"],
    background: "#191724",
  },
  {
    name: "Gruvbox",
    group: "Editor themes",
    colors: ["#cc241d", "#d65d0e", "#d79921", "#98971a", "#458588", "#b16286"],
    background: "#282828",
  },
  {
    name: "Solarized Dark",
    group: "Editor themes",
    colors: ["#dc322f", "#cb4b16", "#b58900", "#859900", "#268bd2", "#6c71c4"],
    background: "#002b36",
  },
  {
    name: "Everforest",
    group: "Editor themes",
    colors: ["#e67e80", "#e69875", "#dbbc7f", "#a7c080", "#7fbbb3", "#d699b6"],
    background: "#2d353b",
  },
  {
    name: "One Dark",
    group: "Editor themes",
    colors: ["#e06c75", "#d19a66", "#e5c07b", "#98c379", "#61afef", "#c678dd"],
    background: "#282c34",
  },
  {
    name: "Monokai",
    group: "Editor themes",
    colors: ["#f92672", "#fd971f", "#e6db74", "#a6e22e", "#66d9ef", "#ae81ff"],
    background: "#272822",
  },
  {
    name: "Kanagawa",
    group: "Editor themes",
    colors: ["#e46876", "#ffa066", "#e6c384", "#98bb6c", "#7fb4ca", "#957fb8"],
    background: "#1f1f28",
  },
  {
    name: "Night Owl",
    group: "Editor themes",
    colors: ["#ef5350", "#f78c6c", "#ecc48d", "#addb67", "#82aaff", "#c792ea"],
    background: "#011627",
  },

  // ------------------------------------------------------- designer & system
  {
    name: "Bauhaus",
    group: "Designer & system",
    // The three primaries repeated, so they alternate around the knot.
    colors: ["#be1e2d", "#ffde17", "#21409a", "#be1e2d", "#ffde17", "#21409a"],
  },
  {
    name: "Mondrian",
    group: "Designer & system",
    // Near-black between each primary.
    colors: ["#dd0100", "#1a1a1a", "#fac901", "#1a1a1a", "#225095", "#1a1a1a"],
  },
  {
    name: "IBM (colorblind-safe)",
    group: "Designer & system",
    colors: ["#648fff", "#785ef0", "#dc267f", "#fe6100", "#ffb000"],
  },
  {
    name: "Flat UI",
    group: "Designer & system",
    colors: ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"],
  },
  {
    name: "Material",
    group: "Designer & system",
    colors: ["#f44336", "#ff9800", "#ffc107", "#4caf50", "#2196f3", "#9c27b0"],
  },
  {
    name: "Tailwind 500s",
    group: "Designer & system",
    colors: ["#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899"],
  },
  {
    name: "Vaporwave",
    group: "Designer & system",
    colors: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff", "#fffb96"],
    background: "#1a1a2e",
  },
  {
    name: "Okabe–Ito (colorblind-safe)",
    group: "Designer & system",
    colors: ["#d55e00", "#e69f00", "#f0e442", "#009e73", "#56b4e9", "#cc79a7"],
  },
  {
    name: "Pastel rainbow",
    group: "Designer & system",
    colors: ["#ffadad", "#ffd6a5", "#fdffb6", "#caffbf", "#a0c4ff", "#bdb2ff"],
  },
  {
    name: "Tropical",
    group: "Designer & system",
    colors: ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#073b4c"],
  },
  {
    name: "Google",
    group: "Designer & system",
    colors: ["#4285f4", "#ea4335", "#fbbc05", "#34a853"],
  },

  // --------------------------------------------------------------- terracotta
  {
    name: "Terracotta",
    group: "Terracotta",
    colors: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
  },
  {
    name: "Terracotta expanded",
    group: "Terracotta",
    // The in-between hues from the 10-color expansion of the palette above.
    colors: ["#287271", "#8ab17d", "#babb74", "#efb366", "#ee8959", "#e76f51"],
  },
  {
    name: "Terracotta minimal",
    group: "Terracotta",
    colors: ["#52ad8f", "#8ab17d", "#babb74", "#efb366", "#ee8959", "#e76f51"],
  },
  {
    name: "Terracotta minimal 2",
    group: "Terracotta",
    colors: ["#7cb069", "#8ab17d", "#babb74", "#efb366", "#ee8959", "#e76f51"],
  },
  {
    name: "Terra",
    group: "Terracotta",
    colors: ["#e07a5f", "#f2cc8f", "#81b29a", "#3d405b", "#f4f1de"],
  },
  {
    name: "Olive & ochre",
    group: "Terracotta",
    colors: ["#bc6c25", "#dda15e", "#fefae0", "#606c38", "#283618"],
  },
  {
    name: "Desert sage",
    group: "Terracotta",
    colors: ["#cb997e", "#ddbea9", "#ffe8d6", "#b7b7a4", "#a5a58d", "#6b705c"],
  },
  {
    name: "Sunset mesa",
    group: "Terracotta",
    colors: ["#eaac8b", "#e56b6f", "#b56576", "#6d597a", "#355070"],
  },
  {
    name: "Dusty rose",
    group: "Terracotta",
    colors: ["#ffcdb2", "#ffb4a2", "#e5989b", "#b5838d", "#6d6875"],
  },
  {
    name: "Teal & terracotta",
    group: "Terracotta",
    colors: ["#008080", "#00abab", "#f1a56f", "#d6764b", "#ba4727"],
  },
  {
    name: "Kiln",
    group: "Terracotta",
    // Fired-clay ramp, from scorched umber to soft peach.
    colors: ["#6e2f1c", "#8a3f24", "#a8502c", "#c46138", "#d97e57", "#eba283"],
  },
  {
    name: "Adobe night",
    group: "Terracotta",
    // Clay and ochre glowing against dark umber.
    colors: ["#e2725b", "#f4a261", "#e9c46a", "#c98f70", "#a3685a", "#8c5b4f"],
    background: "#2b1d16",
  },
  {
    name: "Terracotta pop",
    group: "Terracotta",
    // One terracotta accent over warm neutrals, mirrored like the other pops.
    colors: ["#e2725b", "#e7dccf", "#b3a696", "#5f5449", "#b3a696", "#e7dccf"],
  },

  // -------------------------------------------------------- single-hue ramps
  {
    name: "Ocean",
    group: "Single-hue ramps",
    colors: ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#0ea5e9", "#38bdf8"],
  },
  {
    name: "Sunset",
    group: "Single-hue ramps",
    colors: ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c"],
  },
  {
    name: "Forest",
    group: "Single-hue ramps",
    colors: ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80"],
  },
  {
    name: "Ink",
    group: "Single-hue ramps",
    colors: ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8"],
  },
  {
    name: "Grape",
    group: "Single-hue ramps",
    colors: ["#4c1d95", "#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa"],
  },
  {
    name: "Rose",
    group: "Single-hue ramps",
    colors: ["#881337", "#9f1239", "#be123c", "#e11d48", "#f43f5e", "#fb7185"],
  },
  {
    name: "Ember",
    group: "Single-hue ramps",
    colors: ["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171"],
  },
  {
    name: "Honey",
    group: "Single-hue ramps",
    colors: ["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24"],
  },
  {
    name: "Moss",
    group: "Single-hue ramps",
    colors: ["#365314", "#3f6212", "#4d7c0f", "#65a30d", "#84cc16", "#a3e635"],
  },
  {
    name: "Lagoon",
    group: "Single-hue ramps",
    colors: ["#134e4a", "#115e59", "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf"],
  },
  {
    name: "Glacier",
    group: "Single-hue ramps",
    colors: ["#164e63", "#155e75", "#0e7490", "#0891b2", "#06b6d4", "#22d3ee"],
  },
  {
    name: "Cobalt",
    group: "Single-hue ramps",
    colors: ["#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa"],
  },
  {
    name: "Iris",
    group: "Single-hue ramps",
    colors: ["#312e81", "#3730a3", "#4338ca", "#4f46e5", "#6366f1", "#818cf8"],
  },
  {
    name: "Orchid",
    group: "Single-hue ramps",
    colors: ["#701a75", "#86198f", "#a21caf", "#c026d3", "#d946ef", "#e879f9"],
  },
  {
    // The facet colors of the GemStack gem logo, darkest to lightest.
    name: "Gemstack",
    group: "Single-hue ramps",
    colors: ["#a04adb", "#b054e6", "#be62ee", "#c285f2", "#cd9bf4", "#dec5f8"],
  },
  {
    // The GemStack gem hue extended into darker shades for more contrast.
    name: "Amethyst",
    group: "Single-hue ramps",
    colors: ["#5f0f8a", "#7813ae", "#9117d3", "#a62ce8", "#b551ec", "#c575f0"],
  },

  // ------------------------------------------------------------------ duotone
  duotone("Ink duotone", "#0f172a", "#e2e8f0"),
  duotone("Blueprint", "#1e40af", "#dbeafe"),
  duotone("Crimson & cream", "#dc2626", "#fef3c7"),
  duotone("Midnight & gold", "#1e293b", "#f59e0b"),
  duotone("Forest & mist", "#166534", "#d1fae5"),
  duotone("Teal & sand", "#0f766e", "#e9c46a"),
  duotone("Cobalt & coral", "#2563eb", "#fb7185"),
  duotone("Plum & peach", "#7c3aed", "#fdba74"),
  duotone("Charcoal & chartreuse", "#1f2937", "#a3e635"),
  duotone("Clay & linen", "#e2725b", "#f4f1de"),
  duotone("Espresso & foam", "#3e2723", "#ece0d1"),
  duotone("Neon noir", "#22d3ee", "#f472b6", "#0b1120"),
  duotone("Aurora", "#34d399", "#818cf8", "#0f172a"),

  // ---------------------------------------------------------- minimal accent
  {
    name: "Coral pop",
    group: "Minimal accent",
    colors: ["#f43f5e", "#cbd5e1", "#94a3b8", "#64748b", "#94a3b8", "#cbd5e1"],
  },
  {
    name: "Amber pop",
    group: "Minimal accent",
    colors: ["#f59e0b", "#d1d5db", "#6b7280", "#111827", "#6b7280", "#d1d5db"],
  },
  {
    name: "Mint pop",
    group: "Minimal accent",
    colors: ["#10b981", "#1f2937", "#9ca3af", "#d1d5db", "#9ca3af", "#1f2937"],
  },
  {
    name: "Indigo pop",
    group: "Minimal accent",
    colors: ["#6366f1", "#d1d5db", "#6b7280", "#111827", "#6b7280", "#d1d5db"],
  },
];

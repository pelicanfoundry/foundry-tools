import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";

const { fontFamily: sansFontFamily } = loadPlex("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: monoFontFamily } = loadPlexMono("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const fonts = {
  sans: sansFontFamily,
  mono: monoFontFamily,
} as const;

export const colors = {
  bg: "#0d1117",
  card: "#161b27",
  border: "#2a3045",
  teal: "#00d4a0",
  textPrimary: "#e6edf3",
  textMuted: "#8b949e",
  critical: "#ef4444",
  high: "#fb923c",
  medium: "#fbbf24",
  low: "#4ade80",
  orange: "#f97316",
  gold: "#eab308",
} as const;

export const sizes = {
  statLarge: 72,
  sceneTitle: 48,
  body: 24,
  bodyLarge: 32,
  small: 18,
} as const;

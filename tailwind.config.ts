import type { Config } from "tailwindcss";

/**
 * GradingView — dark, premium visual system.
 * Layered graphite/navy surfaces, off-white text, a restrained steel-blue
 * accent, and vivid semantic grade colors.
 * The `ink` / `surface` / `brand` names are kept (many components use them);
 * their values are the dark palette.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // page + layered surfaces
        canvas: "#0a0e16", // deepest — page background
        surface: {
          DEFAULT: "#121826", // base card
          subtle: "#0e1420", // recessed panel / inset
          raised: "#1a2233", // inputs, hover, elevated chips
        },
        line: {
          DEFAULT: "#232c3f", // hairline borders
          strong: "#303a52", // interactive borders
        },
        // text
        ink: {
          DEFAULT: "#e9edf6", // primary
          soft: "#a8b3c7", // secondary
          muted: "#6f7c93", // tertiary / captions
        },
        // accent — refined steel-blue. Ramp is lightness-inverted for dark:
        // low numbers = dark tints, high numbers = bright accents.
        brand: {
          50: "#101a2e",
          100: "#182541",
          200: "#26375c",
          300: "#3f5a8f",
          400: "#8fb0ec",
          500: "#7ba2ea",
          600: "#6b93e0",
          700: "#a7c3f5",
          800: "#c9dbfa",
        },
        // vivid semantic grade colors (readable on dark)
        grade: {
          a: "#37d9a4",
          b: "#9ade5b",
          c: "#f4c948",
          d: "#f79150",
          f: "#f2686b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 24px 48px -28px rgba(0,0,0,0.75)",
        lift: "0 1px 0 rgba(255,255,255,0.04) inset, 0 32px 64px -24px rgba(0,0,0,0.8)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.18s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

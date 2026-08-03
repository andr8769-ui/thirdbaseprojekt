import type { Config } from "tailwindcss";

// thirdbase design-system tokens surfaced to Tailwind. The prototype styles the
// intricate surfaces with inline styles (ported 1:1); Tailwind carries the reset,
// the font stack and the shared token palette.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "tb-red": "#FF442B",
        "tb-red-600": "#E23417",
        "tb-red-100": "#FFE3DE",
        "tb-blue": "#3355FF",
        "tb-blue-600": "#2440E0",
        "tb-blue-100": "#E1E6FF",
        "tb-ink": "#181818",
        "tb-ink-muted": "#9E9E9E",
        "tb-bg": "#F7F8F9",
        "tb-line": "#E6E8EC",
        "tb-line-strong": "#E1E4E9",
      },
      fontFamily: {
        sans: ["var(--font-instrument-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

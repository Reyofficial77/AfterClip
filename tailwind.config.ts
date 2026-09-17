import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F0E13",
        surface: "#1A1922",
        panel: "#211F2A",
        border: "#302E3B",
        paper: "#F3F1EA",
        muted: "#948FA3",
        flame: {
          DEFAULT: "#FF5A36",
          soft: "#FF7A54",
        },
        lime: "#B7EE4E",
        amber: "#FFC24B",
        rose: "#FF4D6D",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "flame-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(255,90,54,0.18) 0%, rgba(255,90,54,0) 70%)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        emerald: {
          DEFAULT: "#10b981",
        },
        indigo: {
          DEFAULT: "#6366f1",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        "ring-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sweep": {
          "0%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "ring-pulse": "ring-pulse 1.6s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindAnimate],
};
export default config;

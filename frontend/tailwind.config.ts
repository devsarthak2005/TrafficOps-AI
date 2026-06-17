import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#0a0e1a",
        panel: "#10182b",
        elevated: "#151f36",
        "status-healthy": "#22c55e",
        "status-moderate": "#facc15",
        "status-watchlist": "#f97316",
        "status-critical": "#ef4444"
      }
    }
  },
  plugins: []
};

export default config;

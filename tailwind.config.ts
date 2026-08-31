import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        stock: "#F5F5F5",
        ink: "#1A1A1A",
        inkfaint: "#6B6B6B",
        proof: "#C8102E",
        proofdark: "#9E0B22",
        press: "#7A1116",
        pressdark: "#5C0D10",
        amber: "#FFFFFF",
        approve: "#2F6F4F",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      backgroundImage: {
        halftone:
          "radial-gradient(circle, rgba(26,26,26,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        halftone: "8px 8px",
      },
    },
  },
  plugins: [],
};
export default config;

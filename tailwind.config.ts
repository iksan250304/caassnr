import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EEECE4",
        stock: "#E3E0D6",
        ink: "#14171C",
        inkfaint: "#565B63",
        proof: "#1D4E89",
        proofdark: "#153A63",
        press: "#B23A2E",
        pressdark: "#8C2C22",
        amber: "#C08A1E",
        approve: "#2F6F4F",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      backgroundImage: {
        halftone:
          "radial-gradient(circle, rgba(20,23,28,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        halftone: "8px 8px",
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#3C578F",
        navy: "#223155",
        moss: "#9FBAF2",
        sand: "#FDFDF5",
        paper: "#FDFDF5",
        clay: "#EAF3B2",
        line: "#D9E2F6"
      },
      boxShadow: {
        soft: "0 20px 48px rgba(34, 49, 85, 0.12)",
        panel: "0 1px 2px rgba(34, 49, 85, 0.07), 0 16px 36px rgba(34, 49, 85, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;

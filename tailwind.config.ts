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
        ink: "#17201b",
        moss: "#46624a",
        sand: "#f5efe3",
        paper: "#fffbf3",
        clay: "#c76f4b"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 32, 27, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;

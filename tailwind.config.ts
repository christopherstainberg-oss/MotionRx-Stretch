import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f8",
          100: "#d9f0ed",
          200: "#b6e1db",
          300: "#86cbc3",
          400: "#54aea5",
          500: "#3a928a",
          600: "#2c756f",
          700: "#265f5b",
          800: "#224d4a",
          900: "#1f413f",
          950: "#0d2625",
        },
        accent: {
          400: "#f0a06a",
          500: "#e8823d",
          600: "#d96828",
        },
        pain: {
          0: "#22c55e",
          1: "#84cc16",
          2: "#eab308",
          3: "#f97316",
          4: "#ef4444",
          5: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(15, 61, 58, 0.12)",
        card: "0 1px 3px rgba(15, 61, 58, 0.06), 0 8px 24px -8px rgba(15, 61, 58, 0.12)",
      },
      minHeight: {
        touch: "44px",
      },
      spacing: {
        "safe-top": "var(--safe-top)",
        "safe-bottom": "var(--safe-bottom)",
        tabbar: "var(--tabbar-h)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        line: token("line"),
        ink: token("ink"),
        muted: token("muted"),
        brand: token("brand"),
        ok: token("ok"),
        bad: token("bad"),
        warn: token("warn"),
        info: token("info"),
        // Marka paleti: amber, orta slate-mavi, narıncı, qırmızı-narıncı
        sun: token("sun"),
        iris: token("iris"),
        tiger: token("tiger"),
        flame: token("flame"),
      },
      boxShadow: {
        soft: "var(--shadow)",
        hard: "var(--hard)",
        "hard-lg": "var(--hard-lg)",
      },
      keyframes: {
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(-6px) scale(.98)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: { "slide-in": "slide-in .18s ease-out both" },
    },
  },
  plugins: [],
};

export default config;

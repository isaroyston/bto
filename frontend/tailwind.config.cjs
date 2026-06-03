/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
      },
      colors: {
        "hdb-bg": "oklch(var(--color-hdb-bg) / <alpha-value>)",
        "heritage-navy": "oklch(var(--color-heritage-navy) / <alpha-value>)",
        "warm-stone": "oklch(var(--color-warm-stone) / <alpha-value>)",
        "futuristic-teal": "oklch(var(--color-futuristic-teal) / <alpha-value>)",
        "electric-mint": "oklch(var(--color-electric-mint) / <alpha-value>)",
      },
      borderRadius: {
        hdb: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.05)",
      },
    },
  },
  plugins: [],
};

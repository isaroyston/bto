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
        "hdb-bg": "rgb(var(--color-hdb-bg) / <alpha-value>)",
        "heritage-navy": "rgb(var(--color-heritage-navy) / <alpha-value>)",
        "warm-stone": "rgb(var(--color-warm-stone) / <alpha-value>)",
        "futuristic-teal": "rgb(var(--color-futuristic-teal) / <alpha-value>)",
        "electric-mint": "rgb(var(--color-electric-mint) / <alpha-value>)",
      },
      borderRadius: {
        hdb: "8px",
      },
      boxShadow: {
        glass: "0 8px 28px rgba(7, 25, 43, 0.08)",
        fintech: "0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(7, 25, 43, 0.05)",
      },
    },
  },
  plugins: [],
};

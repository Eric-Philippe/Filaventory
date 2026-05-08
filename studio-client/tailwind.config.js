/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/src/**/*.{ts,tsx}", "./src/renderer/index.html"],
  theme: {
    extend: {
      colors: {
        "dark-teal": "#005753",
        "vibrant-orange": "#E74011",
        "light-blue": "#07B4B9",
        "deep-purple": "#252150",
        "vibrant-green": "#10B981",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

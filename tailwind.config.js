/** @type {import('tailwindcss').Config} */
import { evenKeelColors } from "./tailwind-colors.js";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: evenKeelColors,
    },
  },
  plugins: [],
};

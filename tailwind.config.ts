/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#F9F3EF",
        secondary: "#456882",
        tertiary: "#D2C1B6",
        quaternary: "#1B3C53",
        light: "#F4FDFF",
        heavy: "#2D2D2D",
      },
    },
  },
  plugins: [],
};

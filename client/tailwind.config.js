/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pmcd: {
          blue: "#123B69",
          blueSoft: "#E7EEF7",
          gold: "#C9A227",
          goldSoft: "#F6E9B9",
          ink: "#172033"
        }
      }
    }
  },
  plugins: []
};

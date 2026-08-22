/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        razorpay: {
          blue: '#0c2340',
          accent: '#3395ff',
          dark: '#07111e',
          card: '#111c2d',
          border: '#1d2c42'
        }
      }
    },
  },
  plugins: [],
}
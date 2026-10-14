/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1E40AF',
          blueLight: '#3B82F6',
          blueSubtle: '#EFF6FF',
          green: '#10B981',
          greenLight: '#D1FAE5',
          amber: '#F59E0B',
          amberLight: '#FEF3C7',
          red: '#EF4444',
          redLight: '#FEE2E2',
          whatsapp: '#25D366',
        }
      }
    },
  },
  plugins: [],
}

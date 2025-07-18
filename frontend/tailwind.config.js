/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#204274', // Azul principal/header/botones (mismo que backend)
        secondary: '#223A5F', // Azul oscuro/cards/saldo total
        background: '#F5F6FA', // Fondo general
        card: '#F4F8FB', // Fondo de tarjetas
        'success-bg': '#DFF5E3', // Fondo ingresos
        'success-text': '#2E7D32', // Texto ingresos
        'danger-bg': '#FDE7E7', // Fondo gastos
        'danger-text': '#C62828', // Texto gastos
        border: '#E0E3EA', // Bordes/divisores
        text: '#222B45', // Texto principal
        warning: '#FFD600', // Amarillo notificación
      },
    },
  },
  plugins: [],
} 
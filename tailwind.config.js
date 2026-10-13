/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10292e',
        deep: '#0e5c63',
        mist: '#eef3f2',
        line: '#d3dfdd'
      },
      fontFamily: {
        sans: [
          '"Noto Naskh Arabic"',
          '"Segoe UI"',
          'Tahoma',
          'system-ui',
          '-apple-system',
          'Roboto',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
};

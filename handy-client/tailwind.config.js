/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'deep-purple': '#252150',
        'dark-teal': '#005753',
        'vibrant-orange': '#E74011',
        'light-blue': '#07B4B9',
        'vibrant-green': '#10B981',
      },
    },
  },
};

module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          blue: '#5865F2',
          dark: '#202225',
          darker: '#111214',
          darkest: '#040405',
          gray: '#36393F',
          lightGray: '#72767D',
          lighterGray: '#B9BBBE',
          white: '#FFFFFF',
          red: '#ED4245',
          redDark: '#DA373C',
          green: '#1E9448',
          greenDark: '#1B8040',
          yellow: '#FAB12F',
          yellowDark: '#E0A32D',
          purple: '#6C5CE7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
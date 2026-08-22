import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        discord: {
          darkest: "#040405",
          darker: "#111214",
          dark: "#202225",
          gray: "#36393F",
          white: "#FFFFFF",
          lighterGray: "#B9BBBE",
          lightGray: "#72767D",
          blue: "#5865F2",
          purple: "#6C5CE7",
          green: "#1E9448",
          greenDark: "#1B8040",
          yellow: "#FAB12F",
          yellowDark: "#E0A32D",
          red: "#ED4245",
          redDark: "#DA373C",
        },
      },
      fontFamily: {
        sans: ["var(--font-sf-compact)", "system-ui", "sans-serif"],
        mono: ["var(--font-sf-compact)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in-up": "fade-in-up 0.7s ease-out both",
        "float-y": "float-y 6s ease-in-out infinite",
        glow: "glow 4s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        "spin-slow": "spin 24s linear infinite",
        "knob-on": "knob-on 0.45s ease-in-out forwards",
        "knob-off": "knob-off 0.45s ease-in-out forwards",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        tooltip: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "knob-on": {
          "0%": {
            transform: "translateX(0) rotate(0deg)",
            borderRadius: "9999px",
          },
          "45%": {
            transform: "translateX(10px) rotate(90deg)",
            borderRadius: "5px",
          },
          "100%": {
            transform: "translateX(20px) rotate(180deg)",
            borderRadius: "9999px",
          },
        },
        "knob-off": {
          "0%": {
            transform: "translateX(20px) rotate(0deg)",
            borderRadius: "9999px",
          },
          "45%": {
            transform: "translateX(10px) rotate(-90deg)",
            borderRadius: "5px",
          },
          "100%": {
            transform: "translateX(0) rotate(-180deg)",
            borderRadius: "9999px",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;

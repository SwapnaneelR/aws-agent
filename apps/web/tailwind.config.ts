import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030304",
        surface: "#0F1115",
        foreground: "#FFFFFF",
        muted: "#94A3B8",
        border: "#1E293B",
        // Bitcoin DeFi palette
        void: "#030304",
        darkmatter: "#0F1115",
        purelight: "#FFFFFF",
        stardust: "#94A3B8",
        dimborder: "#1E293B",
        btc: {
          DEFAULT: "#F7931A",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F7931A",
          600: "#EA580C",
          700: "#C2410C",
        },
        burnt: "#EA580C",
        gold: {
          DEFAULT: "#FFD600",
          glow: "rgba(255, 214, 0, 0.3)",
        },
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        "glow-orange": "0 0 20px -5px rgba(234, 88, 12, 0.5)",
        "glow-orange-lg": "0 0 30px -5px rgba(247, 147, 26, 0.6)",
        "glow-gold": "0 0 20px rgba(255, 214, 0, 0.3)",
        "card-glow": "0 0 50px -10px rgba(247, 147, 26, 0.1)",
        "card-hover": "0 0 30px -10px rgba(247, 147, 26, 0.25)",
        "input-glow": "0 10px 20px -10px rgba(247, 147, 26, 0.3)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 8px rgba(247,147,26,0.6))" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 2px rgba(247,147,26,0.2))" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite",
        "spin-reverse": "spin-reverse 25s linear infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
      borderRadius: {
        "2xl": "16px",
        xl: "12px",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", md: "2rem", xl: "3rem" }, screens: { "2xl": "1360px" } },
    extend: {
      colors: {
        plum: { DEFAULT: "#241A26", 800: "#2F2232", 700: "#3B2D3F", 600: "#54435A", 500: "#6B5A6E", 400: "#8D7E90" },
        blush: { DEFAULT: "#F5D6E4", 50: "#FCF2F6", 100: "#F9E5EE", 300: "#EDBFD3", 500: "#D98FB1" },
        ivory: { DEFAULT: "#F9F3EF", 100: "#F4ECE6", 200: "#EDE2DA", 300: "#E3D5CB" },
        gold: { DEFAULT: "#C49A73", 600: "#A37B57", 700: "#7E5C3E" },
        success: "#2F6B4F",
        danger: "#A23B4B",
        warning: "#8A5A12",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 6vw + 1rem, 6rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.25rem, 3.5vw + 1rem, 4.25rem)", { lineHeight: "1.06", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.75rem, 2vw + 1rem, 2.75rem)", { lineHeight: "1.12", letterSpacing: "-0.01em" }],
        "display-sm": ["clamp(1.375rem, 1vw + 1rem, 1.875rem)", { lineHeight: "1.2" }],
        eyebrow: ["0.72rem", { lineHeight: "1.2", letterSpacing: "0.22em" }],
      },
      borderRadius: { xl: "1rem", "2xl": "1.5rem", "4xl": "2.5rem", arch: "999px 999px 1.5rem 1.5rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(36,26,38,.04), 0 8px 24px -12px rgba(36,26,38,.12)",
        lift: "0 2px 4px rgba(36,26,38,.04), 0 24px 48px -20px rgba(36,26,38,.22)",
      },
      transitionTimingFunction: { lux: "cubic-bezier(.22,.8,.24,1)" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite", marquee: "marquee 40s linear infinite" },
    },
  },
  plugins: [],
} satisfies Config;

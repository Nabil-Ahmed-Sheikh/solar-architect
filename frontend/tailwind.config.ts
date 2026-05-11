import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary (Solar amber/brown)
        "primary": "#513800",
        "primary-container": "#6e4d00",
        "primary-fixed": "#ffdea8",
        "primary-fixed-dim": "#ffba20",
        "on-primary": "#ffffff",
        "on-primary-container": "#ffbc29",
        "on-primary-fixed": "#271900",
        "on-primary-fixed-variant": "#5e4200",
        "inverse-primary": "#ffba20",

        // Secondary (Teal)
        "secondary": "#19667d",
        "secondary-container": "#a1e4fe",
        "secondary-fixed": "#b7eaff",
        "secondary-fixed-dim": "#8dd0e9",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#1a677d",
        "on-secondary-fixed": "#001f28",
        "on-secondary-fixed-variant": "#004e61",

        // Tertiary
        "tertiary": "#652c00",
        "tertiary-container": "#883e00",
        "tertiary-fixed": "#ffdbc8",
        "tertiary-fixed-dim": "#ffb68b",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ffb78d",
        "on-tertiary-fixed": "#321200",
        "on-tertiary-fixed-variant": "#753400",

        // Surface hierarchy
        "background": "#f8fafb",
        "surface": "#f8fafb",
        "surface-bright": "#f8fafb",
        "surface-dim": "#d8dadb",
        "surface-variant": "#e1e3e4",
        "surface-tint": "#7c5800",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f5",
        "surface-container": "#eceeef",
        "surface-container-high": "#e6e8e9",
        "surface-container-highest": "#e1e3e4",

        // On-surface
        "on-surface": "#191c1d",
        "on-background": "#191c1d",
        "on-surface-variant": "#40484c",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#eff1f2",

        // Outline
        "outline": "#70787d",
        "outline-variant": "#bfc8cc",

        // Error
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        sm: "0.125rem",
        md: "0.25rem",
        lg: "0.25rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
export default config;

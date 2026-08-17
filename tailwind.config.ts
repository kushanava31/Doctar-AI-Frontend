import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Original brand purple scale — kept defined (not deleted) since it's
        // still used by the prescription-upload flow (page.tsx, MedicineEditor,
        // UploadZone, StepIndicator) and the login/signup pages, none of which
        // are in scope for this redesign. Nothing in the redesigned chat UI
        // below references `doctar-*` anymore — see the redesign summary.
        doctar: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        // ── New design-system tokens, ported verbatim from the DOCTAR AI
        // chat redesign mockups (desktop + mobile references). ──
        background: "#f7f9fe",
        "surface-dim": "#E8F0FE",
        "surface-gloss": "#FFFFFF",
        "tertiary-fixed-dim": "#d8b9ff",
        "inverse-on-surface": "#eff1f6",
        "on-error": "#ffffff",
        "primary-container": "#0b57d0",
        "secondary-container": "#9dd2ff",
        "surface-tint": "#0856cf",
        "on-error-container": "#93000a",
        "inverse-primary": "#b2c5ff",
        "outline-variant": "#c3c6d6",
        tertiary: "#6400be",
        outline: "#737785",
        "on-surface-variant": "#424654",
        primary: "#0041a2",
        "on-secondary-fixed": "#001e30",
        "on-secondary-fixed-variant": "#014b71",
        "secondary-fixed-dim": "#97ccf9",
        "on-tertiary-fixed": "#290055",
        "ai-gradient-start": "#4285F4",
        "surface-variant": "#e0e2e7",
        "on-surface": "#181c20",
        "on-primary-fixed-variant": "#0040a1",
        "tertiary-fixed": "#eedcff",
        error: "#ba1a1a",
        "inverse-surface": "#2d3135",
        "error-container": "#ffdad6",
        "surface-container-low": "#f1f4f9",
        "on-primary-container": "#ced9ff",
        "surface-container-highest": "#e0e2e7",
        "on-tertiary-container": "#e7d2ff",
        "on-secondary-container": "#1f5b82",
        "on-primary": "#ffffff",
        "primary-fixed-dim": "#b2c5ff",
        "tertiary-container": "#7e2fda",
        "secondary-fixed": "#cbe6ff",
        "surface-bright": "#f7f9fe",
        "surface-container-high": "#e6e8ed",
        "ai-gradient-end": "#9B72CB",
        "on-tertiary-fixed-variant": "#6300bb",
        surface: "#f7f9fe",
        "on-secondary": "#ffffff",
        "on-primary-fixed": "#001847",
        "surface-container-lowest": "#ffffff",
        "primary-fixed": "#dae2ff",
        secondary: "#29638a",
        "on-background": "#181c20",
        "on-tertiary": "#ffffff",
        "surface-container": "#eceef3",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        gutter: "24px",
        "margin-desktop": "64px",
        unit: "8px",
        "container-max": "1280px",
        "margin-mobile": "20px",
      },
      fontFamily: {
        // Standardized on Hanken Grotesk everywhere (see redesign summary —
        // the two mockups disagreed, desktop used system-ui, mobile used
        // Hanken Grotesk; defaulting to Hanken Grotesk for a consistent
        // brand feel across breakpoints was flagged as an assumption).
        sans: ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "body-lg": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "headline-lg-mobile": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "headline-lg": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "display-lg": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "body-md": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "label-md": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "caption-sm": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        "title-md": ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "500" }],
        "caption-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "title-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
      },
      boxShadow: {
        "soft-surface": "0 4px 20px -2px rgba(0,0,0,0.04), inset 1px 1px 0px rgba(255,255,255,0.8)",
        "soft-pressed": "inset 0 2px 4px rgba(0,0,0,0.06)",
        glass: "0 8px 32px 0 rgba(31,38,135,0.07)",
        "btn-primary": "0 4px 12px rgba(66,133,244,0.25), inset 0 1px 0px rgba(255,255,255,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

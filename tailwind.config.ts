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
        // ── Design-system tokens for the chat UI (ChatInterface, ChatSidebar,
        // ChatWidget only — see the `doctar` scale above for login/signup/
        // prescription-upload, which stay untouched). Ported verbatim from the
        // purple/glass DOCTAR AI mockup (desktop + mobile references), second
        // generation — same Material-3-style key names as the previous
        // (blue) redesign so every existing `bg-primary`/`text-on-surface`/
        // etc. class in those three files just picks up the new palette. ──
        background: "#f9f9ff",
        "surface-dim": "#d3daef",
        "surface-gloss": "#ffffff",
        "tertiary-fixed-dim": "#e6c26f",
        "inverse-on-surface": "#edf0ff",
        "on-error": "#ffffff",
        "primary-container": "#5e4091",
        "secondary-container": "#bc99ff",
        "surface-tint": "#6c4ea0",
        "on-error-container": "#93000a",
        "inverse-primary": "#d5bbff",
        "outline-variant": "#ccc4d2",
        tertiary: "#4a3700",
        outline: "#7b7581",
        "on-surface-variant": "#4a4550",
        primary: "#462878",
        "on-secondary-fixed": "#260059",
        "on-secondary-fixed-variant": "#543291",
        "secondary-fixed-dim": "#d3bbff",
        "on-tertiary-fixed": "#251a00",
        // Both names point at the same purple glow gradient — `ai-glow-*` is
        // the mockup's own name (used going forward); `ai-gradient-*` is kept
        // pointing at the same values so nothing left over from the previous
        // redesign silently reverts to blue.
        "ai-gradient-start": "#5E4091",
        "ai-gradient-end": "#8A68CA",
        "ai-glow-start": "#5E4091",
        "ai-glow-end": "#8A68CA",
        "success-teal": "#2DD4BF",
        "surface-mist": "#F8F6FC",
        "surface-variant": "#dce2f7",
        "on-surface": "#141b2b",
        "on-primary-fixed-variant": "#543686",
        "tertiary-fixed": "#ffdf98",
        error: "#ba1a1a",
        "inverse-surface": "#293040",
        "error-container": "#ffdad6",
        "surface-container-low": "#f1f3ff",
        "on-primary-container": "#d2b7ff",
        "surface-container-highest": "#dce2f7",
        "on-tertiary-container": "#e3bf6c",
        "on-secondary-container": "#4d2a8a",
        "on-primary": "#ffffff",
        "primary-fixed-dim": "#d5bbff",
        "tertiary-container": "#664d00",
        "secondary-fixed": "#ebdcff",
        "surface-bright": "#f9f9ff",
        "surface-container-high": "#e1e8fd",
        "on-tertiary-fixed-variant": "#5a4300",
        surface: "#f9f9ff",
        "on-secondary": "#ffffff",
        "on-primary-fixed": "#270058",
        "surface-container-lowest": "#ffffff",
        "primary-fixed": "#ecdcff",
        secondary: "#6d4bab",
        "on-background": "#141b2b",
        "on-tertiary": "#ffffff",
        "surface-container": "#e9edff",
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
        "margin-desktop": "48px",
        unit: "8px",
        base: "8px",
        "container-max": "1280px",
        "margin-mobile": "16px",
      },
      fontFamily: {
        // Standardized on Plus Jakarta Sans everywhere in the chat UI, per
        // the purple/glass mockup (both its desktop and mobile references
        // agree on this font, unlike the previous redesign's mismatch).
        sans: ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "body-lg": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "headline-lg-mobile": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "headline-lg": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "headline-xl": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "display-lg": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "body-md": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "label-md": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "caption-sm": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        "title-md": ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "500" }],
        "caption-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "title-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
      },
      boxShadow: {
        "soft-surface": "0 4px 20px -2px rgba(0,0,0,0.04), inset 1px 1px 0px rgba(255,255,255,0.8)",
        "soft-pressed": "inset 0 2px 4px rgba(0,0,0,0.06)",
        glass: "0 8px 32px 0 rgba(94,64,145,0.07)",
        "btn-primary": "0 4px 12px rgba(94,64,145,0.25), inset 0 1px 0px rgba(255,255,255,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ChatWidgetMount from "./ChatWidgetMount";
import { AuthProvider } from "@/contexts/AuthContext";
import MaterialIconsLoader from "@/components/MaterialIconsLoader";

// Loaded via next/font/google: self-hosted and inlined at build time (no
// runtime request to Google Fonts, no layout-shift flash of a different
// font). Used as the single body font across every breakpoint, per the
// purple/glass mockup's typography.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DOCTAR — AI Health Assistant",
  description: "Upload prescriptions, find doctors, get health guidance in Hindi & English",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        {/* Material Symbols Outlined — a proper self-updating <link>, not next/font:
            this is a variable icon font (FILL/wght/GRAD/opsz axes used live via
            font-variation-settings per-icon), which next/font's typography-oriented
            API doesn't cleanly support. display=block (not swap) means an icon
            renders invisible for a beat rather than ever flashing its literal
            fallback text (e.g. "search") if the font is slow/fails — see
            .material-symbols-outlined in globals.css for the fallback-safe base rule. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body>
        <MaterialIconsLoader />
        <AuthProvider>
          {children}
          <ChatWidgetMount />
        </AuthProvider>
      </body>
    </html>
  );
}

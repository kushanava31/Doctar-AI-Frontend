"use client";

import { useEffect } from "react";

/**
 * Reveals Material Symbols glyphs only once the font has actually loaded —
 * globals.css starts every `.material-symbols-outlined` span at font-size: 0,
 * so if the font is blocked (ad-blocker, offline, CDN down), icons stay
 * silently invisible instead of showing their literal fallback text (e.g.
 * "search"). `document.fonts.ready` alone doesn't distinguish a genuine load
 * from a failed one, so this checks the specific family via `fonts.load()`.
 */
export default function MaterialIconsLoader() {
  useEffect(() => {
    let cancelled = false;
    document.fonts
      .load('24px "Material Symbols Outlined"')
      .then((loaded) => {
        if (!cancelled && loaded.length > 0) {
          document.documentElement.classList.add("fonts-loaded");
        }
      })
      .catch(() => {
        /* font failed to load — icons remain invisible, not literal text */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

/** Material Symbols Outlined glyph. `name` is the icon's ligature name (e.g. "search").
 * See globals.css for the loaded/fallback behavior and MaterialIconsLoader for the check. */
export default function Icon({
  name,
  className = "",
  filled = false,
  weight = 400,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24` }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

/**
 * Runtime accent theming. The `brand-*` Tailwind scale reads CSS variables
 * (--brand-50 … --brand-900) as RGB channels; this derives a full scale from a
 * single accent hex and writes those variables onto :root, so choosing an
 * accent color in Settings → Branding recolors the whole console live.
 */
type RGB = [number, number, number]

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const mix = (c: RGB, t: RGB, amt: number): RGB =>
  [0, 1, 2].map((i) => Math.round(c[i] + (t[i] - c[i]) * amt)) as RGB

const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [0, 0, 0]

// Tints toward white for the light end, shades toward black for the dark end,
// with the chosen color anchored at 600 (the primary brand shade).
const STOPS: Record<number, { t: RGB; amt: number }> = {
  50: { t: WHITE, amt: 0.92 },
  100: { t: WHITE, amt: 0.84 },
  200: { t: WHITE, amt: 0.68 },
  300: { t: WHITE, amt: 0.5 },
  400: { t: WHITE, amt: 0.3 },
  500: { t: WHITE, amt: 0.14 },
  600: { t: WHITE, amt: 0 },
  700: { t: BLACK, amt: 0.12 },
  800: { t: BLACK, amt: 0.26 },
  900: { t: BLACK, amt: 0.4 },
}

/** Compute the 50–900 scale from an accent hex, as "r g b" channel strings. */
export function brandScale(hex: string): Record<number, string> | null {
  const base = hexToRgb(hex)
  if (!base) return null
  const out: Record<number, string> = {}
  for (const [shade, { t, amt }] of Object.entries(STOPS)) {
    const [r, g, b] = mix(base, t, amt)
    out[Number(shade)] = `${r} ${g} ${b}`
  }
  return out
}

/** Apply an accent hex to the live theme (writes --brand-* on :root). */
export function applyBrandColor(hex: string | undefined) {
  const scale = hex ? brandScale(hex) : null
  const root = document.documentElement
  if (!scale) {
    // Unset → clear overrides so the CSS defaults (brand blue) take over.
    for (const shade of Object.keys(STOPS)) root.style.removeProperty(`--brand-${shade}`)
    return
  }
  for (const [shade, channels] of Object.entries(scale)) {
    root.style.setProperty(`--brand-${shade}`, channels)
  }
}

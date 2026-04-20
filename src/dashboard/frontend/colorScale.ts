/**
 * GVS → CSS color mapping.
 *
 * Strictly monotone: as GVS increases from 0 → 100, hue decreases from 240 → 0.
 * This maps cool (blue) at low GVS to warm (red) at high GVS.
 *
 * Feature: predictive-urban-growth-modeling, Property 32: GVS Color Scale Monotonicity
 */
export function gvsToColor(gvs: number): string {
  const clamped = Math.min(100, Math.max(0, gvs));
  const hue = 240 - (clamped / 100) * 240;
  return `hsl(${hue.toFixed(1)}, 70%, 50%)`;
}

/**
 * Returns a contrasting text color (black or white) for a given GVS value,
 * so tile labels remain readable against the background.
 */
export function gvsToTextColor(gvs: number): string {
  // Mid-range GVS values produce mid-saturation colors; use white for dark backgrounds
  // Hue 240 (blue) and 0 (red) are both dark enough for white text
  // Hue ~120 (green) is lighter — use dark text
  const clamped = Math.min(100, Math.max(0, gvs));
  const hue = 240 - (clamped / 100) * 240;
  // Green range (hue 90–150) is lighter; use dark text
  if (hue >= 90 && hue <= 150) {
    return "#1a1a1a";
  }
  return "#ffffff";
}

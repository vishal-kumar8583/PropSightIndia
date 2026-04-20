/**
 * GVS → CSS color mapping.
 *
 * Strictly monotone: as GVS increases from 0 → 100, hue decreases from 240 → 0.
 * This maps cool (blue) at low GVS to warm (red) at high GVS.
 *
 * Feature: predictive-urban-growth-modeling, Property 32: GVS Color Scale Monotonicity
 */
export declare function gvsToColor(gvs: number): string;
/**
 * Returns a contrasting text color (black or white) for a given GVS value,
 * so tile labels remain readable against the background.
 */
export declare function gvsToTextColor(gvs: number): string;
//# sourceMappingURL=colorScale.d.ts.map
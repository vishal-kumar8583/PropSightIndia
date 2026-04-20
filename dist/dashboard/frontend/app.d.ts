/**
 * PropSight India Dashboard — TypeScript source (type reference only)
 *
 * The browser-runnable version is app.js (plain JS, no build step needed).
 * This file exists for type-checking purposes only.
 *
 * The actual dashboard logic lives in app.js and uses:
 * - Leaflet for the India state choropleth map
 * - Chart.js for GVS bar charts and timeline charts
 * - Inline zone data (ZONES array) with real Indian city coordinates
 * - State-level aggregation (STATE_DATA)
 * - 5 feature modals: ROI Calculator, Compare Zones, Smart Search, Watchlist, Market Timeline
 */
export type { ZoneSummary, ZoneDetail, GVSTimeSeries, TrendFlag, AppState } from "./types.js";
export { gvsToColor, gvsToTextColor } from "./colorScale.js";
//# sourceMappingURL=app.d.ts.map
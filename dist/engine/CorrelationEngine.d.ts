import type { Zone, SignalBundle, GVSResult, WeightConfig, GVSTimeSeries, MunicipalDeclaration, LineageRecord } from "../types/index.js";
import type { AuditStore } from "../audit/AuditStore.js";
export interface CorrelationEngineOptions {
    initialWeights: WeightConfig;
    /** Minimum number of data points (declarations + snapshots) required. Default: 1 */
    minDataPoints?: number;
    auditStore?: AuditStore;
}
export declare class CorrelationEngine {
    private currentWeights;
    private readonly minDataPoints;
    private readonly auditStore?;
    private readonly storedResults;
    private readonly storedLineage;
    constructor(options: CorrelationEngineOptions);
    /** Returns true if the sum of all weight values is within ε = 1e-9 of 1.0 */
    validateWeights(weights: WeightConfig): boolean;
    /**
     * Attempts to update the active weight config.
     * Returns false and retains previous weights if the sum ≠ 1.0.
     */
    updateWeights(weights: WeightConfig): boolean;
    /**
     * Computes the Growth Velocity Score for a Zone given a SignalBundle.
     * Uses the provided weights if supplied and valid; otherwise falls back to currentWeights.
     */
    computeGVS(zone: Zone, signals: SignalBundle, weights?: WeightConfig): GVSResult;
    /**
     * Projects the GVS trajectory for a Zone over the given horizon.
     * Fits a linear trend to historical GVS values, injects event boosts at
     * municipal declaration completion dates, and returns a GVSTimeSeries.
     */
    projectTrajectory(options: {
        zone: Zone;
        currentGVS: number;
        historicalGVS: Array<{
            monthOffset: number;
            score: number;
        }>;
        horizon: number;
        declarations: MunicipalDeclaration[];
        referenceDate?: Date;
    }): GVSTimeSeries;
    /**
     * Recompute GVS for all zones with new weights.
     * Returns array of updated GVSResult records.
     */
    recomputeAll(weights: WeightConfig, zoneSignals: Array<{
        zone: Zone;
        signals: SignalBundle;
    }>): GVSResult[];
    /**
     * Write a lineage record for a GVS computation.
     * Returns the LineageRecord that was written.
     */
    writeLineage(gvsResult: GVSResult, signals: SignalBundle): LineageRecord;
    /** Get all stored GVS results (for testing/querying). */
    getStoredResults(): Map<string, GVSResult>;
    /** Get all stored lineage records (for testing). */
    getStoredLineage(): LineageRecord[];
    private isWeightSumValid;
    /**
     * Derives the seven raw signal values from a SignalBundle.
     *
     * - infrastructureTender: count of infrastructure_tender declarations
     * - cluChange: 1 if any clu_change declaration exists, else 0
     * - metroHighway: 1 if any metro_line or highway declaration exists, else 0
     * - listingDensity: average listingDensity across snapshots (0 if none)
     * - pricingVelocity: average of (pricePerSqftRTM + pricePerSqftUC) / 2 across snapshots
     * - searchVolume: average searchVolume across snapshots (0 if none)
     * - rentalAbsorptionRate: average rentalAbsorptionRate across snapshots (0 if none)
     */
    private extractRawValues;
    /**
     * Computes the slope of a simple linear regression on historical GVS points.
     * Returns 0 if there are 0 or 1 data points.
     */
    private computeSlope;
    /**
     * Computes the number of whole months between two dates (from → to).
     * Positive if `to` is after `from`.
     */
    private monthDiff;
}
//# sourceMappingURL=CorrelationEngine.d.ts.map
import * as crypto from "node:crypto";
/** Fixed normalization ranges for each signal */
const SIGNAL_RANGES = {
    infrastructureTender: { min: 0, max: 10 },
    cluChange: { min: 0, max: 1 },
    metroHighway: { min: 0, max: 1 },
    listingDensity: { min: 0, max: 1000 },
    pricingVelocity: { min: 0, max: 50000 },
    searchVolume: { min: 0, max: 100000 },
    rentalAbsorptionRate: { min: 0, max: 1 },
};
const WEIGHT_SUM_TOLERANCE = 1e-9;
export class CorrelationEngine {
    currentWeights;
    minDataPoints;
    auditStore;
    storedResults = new Map();
    storedLineage = [];
    constructor(options) {
        if (!this.isWeightSumValid(options.initialWeights)) {
            throw new Error("initialWeights sum must equal 1.0 (tolerance ε = 1e-9)");
        }
        this.currentWeights = options.initialWeights;
        this.minDataPoints = options.minDataPoints ?? 1;
        this.auditStore = options.auditStore;
    }
    /** Returns true if the sum of all weight values is within ε = 1e-9 of 1.0 */
    validateWeights(weights) {
        return this.isWeightSumValid(weights);
    }
    /**
     * Attempts to update the active weight config.
     * Returns false and retains previous weights if the sum ≠ 1.0.
     */
    updateWeights(weights) {
        if (!this.isWeightSumValid(weights)) {
            return false;
        }
        this.currentWeights = weights;
        return true;
    }
    /**
     * Computes the Growth Velocity Score for a Zone given a SignalBundle.
     * Uses the provided weights if supplied and valid; otherwise falls back to currentWeights.
     */
    computeGVS(zone, signals, weights) {
        const activeWeights = weights !== undefined && this.isWeightSumValid(weights)
            ? weights
            : this.currentWeights;
        const totalDataPoints = signals.municipalDeclarations.length + signals.marketSnapshots.length;
        if (totalDataPoints < this.minDataPoints) {
            return {
                zoneId: zone.id,
                computedAt: new Date().toISOString(),
                score: "Insufficient Data",
                projectionHorizon: 0,
                confidenceLevel: "High",
                signalBreakdown: [],
                weightsSnapshot: activeWeights,
                inputRecordIds: [],
            };
        }
        // Derive raw signal values from the bundle
        const rawValues = this.extractRawValues(signals);
        // Build signal breakdown and accumulate weighted sum
        const signalBreakdown = [];
        let weightedSum = 0;
        for (const signalName of Object.keys(activeWeights.weights)) {
            const rawValue = rawValues[signalName];
            const weight = activeWeights.weights[signalName];
            const { min, max } = SIGNAL_RANGES[signalName];
            const normalized = max === min ? 0 : (rawValue - min) / (max - min);
            const weightedContribution = weight * normalized * 100;
            weightedSum += weightedContribution;
            signalBreakdown.push({
                signalName,
                rawValue,
                weight,
                weightedContribution,
            });
        }
        const score = Math.min(100, Math.max(0, weightedSum));
        // Collect all input record IDs
        const inputRecordIds = [
            ...signals.municipalDeclarations.map((d) => d.id),
            ...signals.marketSnapshots.map((s) => s.id),
        ];
        return {
            zoneId: zone.id,
            computedAt: new Date().toISOString(),
            score,
            projectionHorizon: 0,
            confidenceLevel: "High",
            signalBreakdown,
            weightsSnapshot: activeWeights,
            inputRecordIds,
        };
    }
    /**
     * Projects the GVS trajectory for a Zone over the given horizon.
     * Fits a linear trend to historical GVS values, injects event boosts at
     * municipal declaration completion dates, and returns a GVSTimeSeries.
     */
    projectTrajectory(options) {
        const { zone, currentGVS, historicalGVS, horizon, declarations } = options;
        const referenceDate = options.referenceDate ?? new Date();
        if (horizon < 24 || horizon > 60) {
            throw new Error("Projection horizon must be between 24 and 60 months");
        }
        // Compute slope via simple linear regression on historical points
        const slope = this.computeSlope(historicalGVS);
        const historicalMonths = historicalGVS.length;
        // Pre-compute event boosts: map monthOffset -> list of declaration ids
        const boostMap = new Map();
        for (const decl of declarations) {
            if (decl.projectedCompletionDate == null)
                continue;
            const completionDate = new Date(decl.projectedCompletionDate);
            const monthOffset = this.monthDiff(referenceDate, completionDate);
            if (monthOffset >= 0 && monthOffset <= horizon - 1) {
                if (!boostMap.has(monthOffset)) {
                    boostMap.set(monthOffset, []);
                }
                boostMap.get(monthOffset).push(decl.id);
            }
        }
        // Build data points
        const dataPoints = [];
        let cumulativeBoost = 0;
        for (let t = 0; t < horizon; t++) {
            // Add any boosts that occur at this month
            const eventsAtT = boostMap.get(t) ?? [];
            cumulativeBoost += eventsAtT.length * 5.0;
            const baseScore = currentGVS + slope * t;
            const adjustedScore = baseScore + cumulativeBoost;
            const projectedScore = Math.min(100, Math.max(0, adjustedScore));
            // Per-data-point confidence
            let confidenceLevel;
            if (t <= historicalMonths) {
                confidenceLevel = "High";
            }
            else if (t <= historicalMonths * 2) {
                confidenceLevel = "Medium";
            }
            else {
                confidenceLevel = "Low";
            }
            dataPoints.push({
                monthOffset: t,
                projectedScore,
                adjustmentEvents: eventsAtT,
                confidenceLevel,
            });
        }
        return {
            zoneId: zone.id,
            horizon,
            generatedAt: new Date().toISOString(),
            dataPoints,
        };
    }
    // ── Public batch / lineage methods ──────────────────────────────────────────
    /**
     * Recompute GVS for all zones with new weights.
     * Returns array of updated GVSResult records.
     */
    recomputeAll(weights, zoneSignals) {
        if (!this.isWeightSumValid(weights)) {
            return [];
        }
        this.currentWeights = weights;
        const results = [];
        for (const { zone, signals } of zoneSignals) {
            const result = this.computeGVS(zone, signals, weights);
            this.storedResults.set(zone.id, result);
            this.writeLineage(result, signals);
            if (this.auditStore) {
                const zoneId = result.zoneId;
                const score = typeof result.score === "number" ? result.score : 0;
                const weightsVersion = result.weightsSnapshot.version;
                this.auditStore.append({
                    id: crypto.randomUUID(),
                    eventType: "computation",
                    timestamp: new Date().toISOString(),
                    actorId: "CorrelationEngine",
                    payload: { zoneId, score, weightsVersion },
                    correlationId: crypto.randomUUID(),
                });
            }
            results.push(result);
        }
        return results;
    }
    /**
     * Write a lineage record for a GVS computation.
     * Returns the LineageRecord that was written.
     */
    writeLineage(gvsResult, signals) {
        const inputValues = {};
        for (const contribution of gvsResult.signalBreakdown) {
            inputValues[contribution.signalName] = contribution.rawValue;
        }
        const record = {
            gvsResultId: `${gvsResult.zoneId}-${gvsResult.computedAt}`,
            zoneId: gvsResult.zoneId,
            computedAt: gvsResult.computedAt,
            municipalDeclarationIds: signals.municipalDeclarations.map((d) => d.id),
            marketSnapshotIds: signals.marketSnapshots.map((s) => s.id),
            weightsVersion: gvsResult.weightsSnapshot.version,
            computationSteps: [
                {
                    stepName: "weighted_linear_combination",
                    inputValues,
                    outputValue: typeof gvsResult.score === "number" ? gvsResult.score : 0,
                    formula: "GVS = clamp(Σ weight_i × normalized_i × 100, 0, 100)",
                },
            ],
        };
        this.storedLineage.push(record);
        if (this.auditStore) {
            this.auditStore.appendLineage(record);
        }
        return record;
    }
    /** Get all stored GVS results (for testing/querying). */
    getStoredResults() {
        return this.storedResults;
    }
    /** Get all stored lineage records (for testing). */
    getStoredLineage() {
        return this.storedLineage;
    }
    // ── Private helpers ──────────────────────────────────────────────────────────
    isWeightSumValid(weights) {
        const sum = Object.values(weights.weights).reduce((acc, w) => acc + w, 0);
        return Math.abs(sum - 1.0) <= WEIGHT_SUM_TOLERANCE;
    }
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
    extractRawValues(signals) {
        const decls = signals.municipalDeclarations;
        const snaps = signals.marketSnapshots;
        const infrastructureTender = decls.filter((d) => d.declarationType === "infrastructure_tender").length;
        const cluChange = decls.some((d) => d.declarationType === "clu_change")
            ? 1
            : 0;
        const metroHighway = decls.some((d) => d.declarationType === "metro_line" ||
            d.declarationType === "highway")
            ? 1
            : 0;
        const snapCount = snaps.length;
        const listingDensity = snapCount === 0
            ? 0
            : snaps.reduce((acc, s) => acc + s.listingDensity, 0) / snapCount;
        const pricingVelocity = snapCount === 0
            ? 0
            : snaps.reduce((acc, s) => acc + (s.pricePerSqftRTM + s.pricePerSqftUC) / 2, 0) / snapCount;
        const searchVolume = snapCount === 0
            ? 0
            : snaps.reduce((acc, s) => acc + s.searchVolume, 0) / snapCount;
        const rentalAbsorptionRate = snapCount === 0
            ? 0
            : snaps.reduce((acc, s) => acc + s.rentalAbsorptionRate, 0) / snapCount;
        return {
            infrastructureTender,
            cluChange,
            metroHighway,
            listingDensity,
            pricingVelocity,
            searchVolume,
            rentalAbsorptionRate,
        };
    }
    /**
     * Computes the slope of a simple linear regression on historical GVS points.
     * Returns 0 if there are 0 or 1 data points.
     */
    computeSlope(historicalGVS) {
        if (historicalGVS.length <= 1)
            return 0;
        const n = historicalGVS.length;
        const sumX = historicalGVS.reduce((acc, p) => acc + p.monthOffset, 0);
        const sumY = historicalGVS.reduce((acc, p) => acc + p.score, 0);
        const sumXY = historicalGVS.reduce((acc, p) => acc + p.monthOffset * p.score, 0);
        const sumX2 = historicalGVS.reduce((acc, p) => acc + p.monthOffset * p.monthOffset, 0);
        const denom = n * sumX2 - sumX * sumX;
        if (denom === 0)
            return 0;
        return (n * sumXY - sumX * sumY) / denom;
    }
    /**
     * Computes the number of whole months between two dates (from → to).
     * Positive if `to` is after `from`.
     */
    monthDiff(from, to) {
        return ((to.getFullYear() - from.getFullYear()) * 12 +
            (to.getMonth() - from.getMonth()));
    }
}
//# sourceMappingURL=CorrelationEngine.js.map
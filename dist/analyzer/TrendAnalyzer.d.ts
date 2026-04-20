import type { MarketSnapshot, TrendResult } from "../types/index.js";
export interface TrendAnalyzerOptions {
    appreciationThreshold?: number;
    divergenceThreshold?: number;
}
export declare class TrendAnalyzer {
    private readonly appreciationThreshold;
    private readonly divergenceThreshold;
    constructor(options?: TrendAnalyzerOptions);
    /**
     * Compute pricing velocity for RTM and UC categories.
     * Requires ≥ 3 snapshots (oldest-first).
     * Formula: ((price_current - price_3_cycles_ago) / price_3_cycles_ago) / 3 × 100
     */
    computePricingVelocity(history: MarketSnapshot[]): {
        rtm: number | "Insufficient History";
        uc: number | "Insufficient History";
    };
    /**
     * Compute rental yield delta: current annualized yield minus mean of last 6 months.
     * annualized_yield = rentalAbsorptionRate × 4 (as a percentage)
     * Requires ≥ 7 snapshots (1 current + 6 prior).
     */
    computeRentalYieldDelta(history: MarketSnapshot[]): number | "Insufficient History";
    /**
     * Compute a full TrendResult for a zone given its history and thresholds.
     */
    computeTrendResult(options: {
        zoneId: string;
        history: MarketSnapshot[];
        appreciationThreshold: number;
        divergenceThreshold: number;
    }): TrendResult;
    /**
     * Rank zones by combined metric: (pricingVelocityRTM + pricingVelocityUC) / 2 + rentalYieldDelta.
     * "Insufficient History" values are treated as 0 for sorting.
     * Assigns rank 1 to highest, 2 to second, etc.
     * All input zones appear in output.
     */
    rankZones(results: TrendResult[]): TrendResult[];
}
//# sourceMappingURL=TrendAnalyzer.d.ts.map
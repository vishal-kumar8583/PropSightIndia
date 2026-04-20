import type { MarketSnapshot, TrendResult } from "../types/index.js";

export interface TrendAnalyzerOptions {
  appreciationThreshold?: number; // default: 1.0 (% per month)
  divergenceThreshold?: number;   // default: 0.5 (percentage points)
}

export class TrendAnalyzer {
  private readonly appreciationThreshold: number;
  private readonly divergenceThreshold: number;

  constructor(options?: TrendAnalyzerOptions) {
    this.appreciationThreshold = options?.appreciationThreshold ?? 1.0;
    this.divergenceThreshold = options?.divergenceThreshold ?? 0.5;
  }

  /**
   * Compute pricing velocity for RTM and UC categories.
   * Requires ≥ 3 snapshots (oldest-first).
   * Formula: ((price_current - price_3_cycles_ago) / price_3_cycles_ago) / 3 × 100
   */
  computePricingVelocity(history: MarketSnapshot[]): {
    rtm: number | "Insufficient History";
    uc: number | "Insufficient History";
  } {
    if (history.length < 3) {
      return { rtm: "Insufficient History", uc: "Insufficient History" };
    }

    const current = history[history.length - 1];
    const threeCyclesAgo = history[history.length - 3];

    const rtm =
      ((current.pricePerSqftRTM - threeCyclesAgo.pricePerSqftRTM) /
        threeCyclesAgo.pricePerSqftRTM) /
      3 *
      100;

    const uc =
      ((current.pricePerSqftUC - threeCyclesAgo.pricePerSqftUC) /
        threeCyclesAgo.pricePerSqftUC) /
      3 *
      100;

    return { rtm, uc };
  }

  /**
   * Compute rental yield delta: current annualized yield minus mean of last 6 months.
   * annualized_yield = rentalAbsorptionRate × 4 (as a percentage)
   * Requires ≥ 7 snapshots (1 current + 6 prior).
   */
  computeRentalYieldDelta(history: MarketSnapshot[]): number | "Insufficient History" {
    if (history.length < 7) {
      return "Insufficient History";
    }

    const annualizedYield = (snap: MarketSnapshot): number =>
      snap.rentalAbsorptionRate * 4;

    const current = history[history.length - 1];
    const currentYield = annualizedYield(current);

    const prior6 = history.slice(history.length - 7, history.length - 1);
    const mean =
      prior6.reduce((sum, snap) => sum + annualizedYield(snap), 0) / 6;

    return currentYield - mean;
  }

  /**
   * Compute a full TrendResult for a zone given its history and thresholds.
   */
  computeTrendResult(options: {
    zoneId: string;
    history: MarketSnapshot[];
    appreciationThreshold: number;
    divergenceThreshold: number;
  }): TrendResult {
    const { zoneId, history, appreciationThreshold, divergenceThreshold } = options;

    const velocity = this.computePricingVelocity(history);
    const rentalYieldDelta = this.computeRentalYieldDelta(history);

    const flags: Array<"Appreciating" | "Undervalued"> = [];

    // Compute average velocity for flag logic
    let avgVelocity: number | null = null;
    if (typeof velocity.rtm === "number" && typeof velocity.uc === "number") {
      avgVelocity = (velocity.rtm + velocity.uc) / 2;
    } else if (typeof velocity.rtm === "number") {
      avgVelocity = velocity.rtm;
    } else if (typeof velocity.uc === "number") {
      avgVelocity = velocity.uc;
    }

    if (avgVelocity !== null && avgVelocity > appreciationThreshold) {
      flags.push("Appreciating");
    }

    if (typeof rentalYieldDelta === "number" && rentalYieldDelta > divergenceThreshold) {
      flags.push("Undervalued");
    }

    return {
      zoneId,
      computedAt: new Date().toISOString(),
      pricingVelocityRTM: velocity.rtm,
      pricingVelocityUC: velocity.uc,
      rentalYieldDelta,
      flags,
      rank: null,
    };
  }

  /**
   * Rank zones by combined metric: (pricingVelocityRTM + pricingVelocityUC) / 2 + rentalYieldDelta.
   * "Insufficient History" values are treated as 0 for sorting.
   * Assigns rank 1 to highest, 2 to second, etc.
   * All input zones appear in output.
   */
  rankZones(results: TrendResult[]): TrendResult[] {
    const toNumber = (v: number | "Insufficient History"): number =>
      typeof v === "number" ? v : 0;

    const combinedMetric = (r: TrendResult): number => {
      const rtm = toNumber(r.pricingVelocityRTM);
      const uc = toNumber(r.pricingVelocityUC);
      const delta = toNumber(r.rentalYieldDelta);
      return (rtm + uc) / 2 + delta;
    };

    const sorted = [...results].sort(
      (a, b) => combinedMetric(b) - combinedMetric(a)
    );

    return sorted.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
  }
}

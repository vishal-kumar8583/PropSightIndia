import type { GVSResult, TrendResult, GVSTimeSeries, WeightConfig } from "../../types/index.js";

const DEFAULT_STALENESS_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

const DEFAULT_WEIGHT_CONFIG: WeightConfig = {
  version: "1.0.0",
  updatedAt: new Date().toISOString(),
  weights: {
    infrastructureTender: 1 / 7,
    cluChange: 1 / 7,
    metroHighway: 1 / 7,
    listingDensity: 1 / 7,
    pricingVelocity: 1 / 7,
    searchVolume: 1 / 7,
    rentalAbsorptionRate: 1 / 7,
  },
};

export class InMemoryStore {
  private gvsResults: Map<string, GVSResult> = new Map();
  private trendResults: Map<string, TrendResult> = new Map();
  private trajectories: Map<string, GVSTimeSeries> = new Map();
  private weightConfig: WeightConfig = DEFAULT_WEIGHT_CONFIG;
  private stalenessThresholdMs: number = DEFAULT_STALENESS_THRESHOLD_MS;

  setGVSResult(result: GVSResult): void {
    this.gvsResults.set(result.zoneId, result);
  }

  getGVSResult(zoneId: string): GVSResult | undefined {
    return this.gvsResults.get(zoneId);
  }

  getAllGVSResults(): GVSResult[] {
    return Array.from(this.gvsResults.values());
  }

  setTrendResult(result: TrendResult): void {
    this.trendResults.set(result.zoneId, result);
  }

  getTrendResult(zoneId: string): TrendResult | undefined {
    return this.trendResults.get(zoneId);
  }

  setTrajectory(zoneId: string, trajectory: GVSTimeSeries): void {
    this.trajectories.set(zoneId, trajectory);
  }

  getTrajectory(zoneId: string): GVSTimeSeries | undefined {
    return this.trajectories.get(zoneId);
  }

  setWeightConfig(config: WeightConfig): void {
    this.weightConfig = config;
  }

  getWeightConfig(): WeightConfig {
    return this.weightConfig;
  }

  getStalenessThresholdMs(): number {
    return this.stalenessThresholdMs;
  }

  setStalenessThresholdMs(ms: number): void {
    this.stalenessThresholdMs = ms;
  }
}

import type { GVSResult, TrendResult, GVSTimeSeries, WeightConfig } from "../../types/index.js";
export declare class InMemoryStore {
    private gvsResults;
    private trendResults;
    private trajectories;
    private weightConfig;
    private stalenessThresholdMs;
    setGVSResult(result: GVSResult): void;
    getGVSResult(zoneId: string): GVSResult | undefined;
    getAllGVSResults(): GVSResult[];
    setTrendResult(result: TrendResult): void;
    getTrendResult(zoneId: string): TrendResult | undefined;
    setTrajectory(zoneId: string, trajectory: GVSTimeSeries): void;
    getTrajectory(zoneId: string): GVSTimeSeries | undefined;
    setWeightConfig(config: WeightConfig): void;
    getWeightConfig(): WeightConfig;
    getStalenessThresholdMs(): number;
    setStalenessThresholdMs(ms: number): void;
}
//# sourceMappingURL=store.d.ts.map
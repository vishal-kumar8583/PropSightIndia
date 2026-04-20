const DEFAULT_STALENESS_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_WEIGHT_CONFIG = {
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
    gvsResults = new Map();
    trendResults = new Map();
    trajectories = new Map();
    weightConfig = DEFAULT_WEIGHT_CONFIG;
    stalenessThresholdMs = DEFAULT_STALENESS_THRESHOLD_MS;
    setGVSResult(result) {
        this.gvsResults.set(result.zoneId, result);
    }
    getGVSResult(zoneId) {
        return this.gvsResults.get(zoneId);
    }
    getAllGVSResults() {
        return Array.from(this.gvsResults.values());
    }
    setTrendResult(result) {
        this.trendResults.set(result.zoneId, result);
    }
    getTrendResult(zoneId) {
        return this.trendResults.get(zoneId);
    }
    setTrajectory(zoneId, trajectory) {
        this.trajectories.set(zoneId, trajectory);
    }
    getTrajectory(zoneId) {
        return this.trajectories.get(zoneId);
    }
    setWeightConfig(config) {
        this.weightConfig = config;
    }
    getWeightConfig() {
        return this.weightConfig;
    }
    getStalenessThresholdMs() {
        return this.stalenessThresholdMs;
    }
    setStalenessThresholdMs(ms) {
        this.stalenessThresholdMs = ms;
    }
}
//# sourceMappingURL=store.js.map
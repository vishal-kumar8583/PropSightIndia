export interface ZoneSummary {
    zoneId: string;
    score: number | "Insufficient Data";
    flags: Array<"Appreciating" | "Undervalued">;
    computedAt: string;
    isStale: boolean;
}
export interface SignalContribution {
    signalName: string;
    rawValue: number;
    weight: number;
    weightedContribution: number;
}
export interface ZoneDetail extends ZoneSummary {
    signalBreakdown: SignalContribution[];
    pricingVelocityRTM: number | "Insufficient History";
    pricingVelocityUC: number | "Insufficient History";
    rentalAbsorptionRate: number;
    rentalYieldDelta: number | "Insufficient History";
}
export interface TrajectoryDataPoint {
    monthOffset: number;
    projectedScore: number;
    adjustmentEvents: string[];
    confidenceLevel: "High" | "Medium" | "Low";
}
export interface GVSTimeSeries {
    zoneId: string;
    horizon: number;
    generatedAt: string;
    dataPoints: TrajectoryDataPoint[];
}
export type TrendFlag = "Appreciating" | "Undervalued";
export interface AppState {
    zones: ZoneSummary[];
    selectedZoneId: string | null;
    selectedZoneDetail: ZoneDetail | null;
    trajectory: GVSTimeSeries | null;
    projectionHorizon: number;
    activeFlags: Set<TrendFlag>;
    loading: boolean;
    detailLoading: boolean;
}
//# sourceMappingURL=types.d.ts.map
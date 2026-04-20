import type { SignalContribution } from "../../types/index.js";
export interface ZoneSummary {
    zoneId: string;
    score: number | "Insufficient Data";
    flags: Array<"Appreciating" | "Undervalued">;
    computedAt: string;
    isStale: boolean;
}
export interface ZoneDetail extends ZoneSummary {
    signalBreakdown: SignalContribution[];
    pricingVelocityRTM: number | "Insufficient History";
    pricingVelocityUC: number | "Insufficient History";
    rentalAbsorptionRate: number;
    rentalYieldDelta: number | "Insufficient History";
}
//# sourceMappingURL=types.d.ts.map
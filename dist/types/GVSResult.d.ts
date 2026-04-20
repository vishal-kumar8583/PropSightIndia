import type { ISODateString } from "./MunicipalDeclaration.js";
import type { WeightConfig } from "./WeightConfig.js";
export interface SignalContribution {
    signalName: string;
    rawValue: number;
    weight: number;
    weightedContribution: number;
}
export interface GVSResult {
    zoneId: string;
    computedAt: ISODateString;
    score: number | "Insufficient Data";
    /** Projection horizon in months */
    projectionHorizon: number;
    confidenceLevel: "High" | "Medium" | "Low";
    signalBreakdown: SignalContribution[];
    weightsSnapshot: WeightConfig;
    /** IDs of MunicipalDeclaration + MarketSnapshot records used */
    inputRecordIds: string[];
}
//# sourceMappingURL=GVSResult.d.ts.map
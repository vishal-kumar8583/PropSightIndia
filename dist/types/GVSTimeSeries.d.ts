import type { ISODateString } from "./MunicipalDeclaration.js";
export interface GVSTimeSeries {
    zoneId: string;
    /** Projection horizon in months */
    horizon: number;
    generatedAt: ISODateString;
    dataPoints: Array<{
        /** 0 = current month */
        monthOffset: number;
        projectedScore: number;
        /** Declaration IDs contributing an adjustment at this time point */
        adjustmentEvents: string[];
        confidenceLevel: "High" | "Medium" | "Low";
    }>;
}
//# sourceMappingURL=GVSTimeSeries.d.ts.map
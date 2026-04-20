import type { ISODateString } from "./MunicipalDeclaration.js";
export interface WeightConfig {
    version: string;
    updatedAt: ISODateString;
    /**
     * Invariant: sum of all weight values === 1.0 (tolerance ε = 1e-9)
     */
    weights: {
        infrastructureTender: number;
        cluChange: number;
        metroHighway: number;
        listingDensity: number;
        pricingVelocity: number;
        searchVolume: number;
        rentalAbsorptionRate: number;
    };
}
//# sourceMappingURL=WeightConfig.d.ts.map
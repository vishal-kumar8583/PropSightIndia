import type { ISODateString } from "./MunicipalDeclaration.js";
export interface ComputationStep {
    stepName: string;
    inputValues: Record<string, number>;
    outputValue: number;
    formula: string;
}
export interface LineageRecord {
    gvsResultId: string;
    zoneId: string;
    computedAt: ISODateString;
    municipalDeclarationIds: string[];
    marketSnapshotIds: string[];
    weightsVersion: string;
    computationSteps: ComputationStep[];
}
//# sourceMappingURL=LineageRecord.d.ts.map
import type { MunicipalDeclaration, MunicipalSourceConfig, IngestResult, ParseError, RawDocument, Result } from "../types/index.js";
import type { AuditStore } from "../audit/AuditStore.js";
export declare class MunicipalParser {
    private readonly onDeclaration?;
    private readonly auditStore?;
    private readonly failedDocuments;
    constructor(options?: {
        onDeclaration?: (decl: MunicipalDeclaration) => void;
        auditStore?: AuditStore;
    });
    parseDocument(raw: RawDocument): Result<MunicipalDeclaration, ParseError>;
    deduplicateDeclarations(records: MunicipalDeclaration[]): MunicipalDeclaration[];
    runCycle(source: MunicipalSourceConfig): Promise<IngestResult>;
    getFailedDocuments(): readonly string[];
}
//# sourceMappingURL=MunicipalParser.d.ts.map
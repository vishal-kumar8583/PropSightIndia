import type { MarketSnapshot, MarketSourceConfig, IngestResult, ParseError, RawPayload, Result } from "../types/index.js";
import type { AuditStore } from "../audit/AuditStore.js";
export declare class MarketAggregator {
    private readonly onSnapshot?;
    private readonly auditStore?;
    private lastCycleErrors;
    constructor(options?: {
        onSnapshot?: (snapshot: MarketSnapshot) => void;
        auditStore?: AuditStore;
    });
    parsePayload(raw: RawPayload): Result<MarketSnapshot, ParseError>;
    deduplicateListings(snapshots: MarketSnapshot[]): MarketSnapshot[];
    runCycle(source: MarketSourceConfig): Promise<IngestResult>;
    getErrors(): readonly string[];
}
//# sourceMappingURL=MarketAggregator.d.ts.map
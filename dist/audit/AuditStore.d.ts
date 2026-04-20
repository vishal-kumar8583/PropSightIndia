import type { AuditLogEntry, LineageRecord, ISODateString } from "../types/index.js";
export interface AuditStoreOptions {
    maxBytes?: number;
    retentionMonths?: number;
    onCapacityAlert?: (msg: string) => void;
}
export declare class AuditStore {
    private readonly entries;
    private readonly lineageRecords;
    private usedBytes;
    private readonly maxBytes;
    private readonly retentionMonths;
    private readonly onCapacityAlert;
    constructor(options?: AuditStoreOptions);
    /** Append an audit log entry (append-only; never mutates or deletes within retention period). */
    append(entry: AuditLogEntry): void;
    /** Append a lineage record for later lineage queries. */
    appendLineage(record: LineageRecord): void;
    /**
     * Returns the LineageRecord whose `computedAt` is closest to (and not after)
     * the given timestamp for the given zoneId.
     */
    query(zoneId: string, timestamp: ISODateString): LineageRecord | undefined;
    /**
     * Prune entries older than the configured retention period.
     * Only called explicitly — never automatic.
     */
    prune(): void;
    /** Returns the total number of audit log entries (for invariant testing). */
    getEntryCount(): number;
    /** Returns all lineage records (for testing). */
    getLineageRecords(): readonly LineageRecord[];
    /** Returns current used bytes (approximate). */
    getUsedBytes(): number;
    /** Returns configured max bytes. */
    getMaxBytes(): number;
    private estimateBytes;
    private checkCapacity;
}
//# sourceMappingURL=AuditStore.d.ts.map
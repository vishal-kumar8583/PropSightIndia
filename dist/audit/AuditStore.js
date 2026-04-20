export class AuditStore {
    entries = [];
    lineageRecords = [];
    usedBytes = 0;
    maxBytes;
    retentionMonths;
    onCapacityAlert;
    constructor(options = {}) {
        this.maxBytes = options.maxBytes ?? 1_073_741_824; // 1 GB default
        this.retentionMonths = Math.max(options.retentionMonths ?? 24, 24); // minimum 24 months
        this.onCapacityAlert = options.onCapacityAlert;
    }
    /** Append an audit log entry (append-only; never mutates or deletes within retention period). */
    append(entry) {
        this.entries.push(entry);
        this.usedBytes += this.estimateBytes(entry);
        this.checkCapacity();
    }
    /** Append a lineage record for later lineage queries. */
    appendLineage(record) {
        this.lineageRecords.push(record);
        this.usedBytes += this.estimateBytes(record);
        this.checkCapacity();
    }
    /**
     * Returns the LineageRecord whose `computedAt` is closest to (and not after)
     * the given timestamp for the given zoneId.
     */
    query(zoneId, timestamp) {
        const ts = new Date(timestamp).getTime();
        let best;
        let bestDiff = Infinity;
        for (const record of this.lineageRecords) {
            if (record.zoneId !== zoneId)
                continue;
            const recordTs = new Date(record.computedAt).getTime();
            if (recordTs > ts)
                continue; // must not be after the given timestamp
            const diff = ts - recordTs;
            if (diff < bestDiff) {
                bestDiff = diff;
                best = record;
            }
        }
        return best;
    }
    /**
     * Prune entries older than the configured retention period.
     * Only called explicitly — never automatic.
     */
    prune() {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - this.retentionMonths);
        const cutoffTs = cutoff.getTime();
        const prunedEntries = [];
        for (const entry of this.entries) {
            if (new Date(entry.timestamp).getTime() >= cutoffTs) {
                prunedEntries.push(entry);
            }
        }
        const prunedLineage = [];
        for (const record of this.lineageRecords) {
            if (new Date(record.computedAt).getTime() >= cutoffTs) {
                prunedLineage.push(record);
            }
        }
        this.entries.length = 0;
        this.entries.push(...prunedEntries);
        this.lineageRecords.length = 0;
        this.lineageRecords.push(...prunedLineage);
        // Recalculate used bytes after pruning
        this.usedBytes = 0;
        for (const entry of this.entries) {
            this.usedBytes += this.estimateBytes(entry);
        }
        for (const record of this.lineageRecords) {
            this.usedBytes += this.estimateBytes(record);
        }
    }
    /** Returns the total number of audit log entries (for invariant testing). */
    getEntryCount() {
        return this.entries.length;
    }
    /** Returns all lineage records (for testing). */
    getLineageRecords() {
        return this.lineageRecords;
    }
    /** Returns current used bytes (approximate). */
    getUsedBytes() {
        return this.usedBytes;
    }
    /** Returns configured max bytes. */
    getMaxBytes() {
        return this.maxBytes;
    }
    estimateBytes(value) {
        return Buffer.byteLength(JSON.stringify(value), "utf8");
    }
    checkCapacity() {
        if (this.usedBytes / this.maxBytes >= 0.9) {
            const pct = ((this.usedBytes / this.maxBytes) * 100).toFixed(1);
            this.onCapacityAlert?.(`AuditStore capacity alert: ${pct}% used (${this.usedBytes} / ${this.maxBytes} bytes)`);
        }
    }
}
//# sourceMappingURL=AuditStore.js.map
import type { AuditLogEntry, LineageRecord, ISODateString } from "../types/index.js";

export interface AuditStoreOptions {
  maxBytes?: number;
  retentionMonths?: number;
  onCapacityAlert?: (msg: string) => void;
}

export class AuditStore {
  private readonly entries: AuditLogEntry[] = [];
  private readonly lineageRecords: LineageRecord[] = [];
  private usedBytes = 0;

  private readonly maxBytes: number;
  private readonly retentionMonths: number;
  private readonly onCapacityAlert: ((msg: string) => void) | undefined;

  constructor(options: AuditStoreOptions = {}) {
    this.maxBytes = options.maxBytes ?? 1_073_741_824; // 1 GB default
    this.retentionMonths = Math.max(options.retentionMonths ?? 24, 24); // minimum 24 months
    this.onCapacityAlert = options.onCapacityAlert;
  }

  /** Append an audit log entry (append-only; never mutates or deletes within retention period). */
  append(entry: AuditLogEntry): void {
    this.entries.push(entry);
    this.usedBytes += this.estimateBytes(entry);
    this.checkCapacity();
  }

  /** Append a lineage record for later lineage queries. */
  appendLineage(record: LineageRecord): void {
    this.lineageRecords.push(record);
    this.usedBytes += this.estimateBytes(record);
    this.checkCapacity();
  }

  /**
   * Returns the LineageRecord whose `computedAt` is closest to (and not after)
   * the given timestamp for the given zoneId.
   */
  query(zoneId: string, timestamp: ISODateString): LineageRecord | undefined {
    const ts = new Date(timestamp).getTime();

    let best: LineageRecord | undefined;
    let bestDiff = Infinity;

    for (const record of this.lineageRecords) {
      if (record.zoneId !== zoneId) continue;
      const recordTs = new Date(record.computedAt).getTime();
      if (recordTs > ts) continue; // must not be after the given timestamp
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
  prune(): void {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - this.retentionMonths);
    const cutoffTs = cutoff.getTime();

    const prunedEntries: AuditLogEntry[] = [];
    for (const entry of this.entries) {
      if (new Date(entry.timestamp).getTime() >= cutoffTs) {
        prunedEntries.push(entry);
      }
    }

    const prunedLineage: LineageRecord[] = [];
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
  getEntryCount(): number {
    return this.entries.length;
  }

  /** Returns all lineage records (for testing). */
  getLineageRecords(): readonly LineageRecord[] {
    return this.lineageRecords;
  }

  /** Returns current used bytes (approximate). */
  getUsedBytes(): number {
    return this.usedBytes;
  }

  /** Returns configured max bytes. */
  getMaxBytes(): number {
    return this.maxBytes;
  }

  private estimateBytes(value: unknown): number {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  }

  private checkCapacity(): void {
    if (this.usedBytes / this.maxBytes >= 0.9) {
      const pct = ((this.usedBytes / this.maxBytes) * 100).toFixed(1);
      this.onCapacityAlert?.(
        `AuditStore capacity alert: ${pct}% used (${this.usedBytes} / ${this.maxBytes} bytes)`
      );
    }
  }
}

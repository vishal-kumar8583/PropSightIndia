import { createHash } from "crypto";
import type {
  MarketSnapshot,
  MarketSourceConfig,
  IngestResult,
  ParseError,
  RawPayload,
  Result,
} from "../types/index.js";
import { Ok, Err } from "../types/index.js";
import type { AuditStore } from "../audit/AuditStore.js";

function contentHash(data: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function requireNumber(data: Record<string, unknown>, field: string): Result<number, ParseError> {
  const value = data[field];
  if (value === undefined || value === null) {
    return Err({ message: `Missing required field: ${field}`, field });
  }
  if (typeof value !== "number") {
    return Err({ message: `Field "${field}" must be a number, got ${typeof value}`, field });
  }
  return Ok(value);
}

function requireString(data: Record<string, unknown>, field: string): Result<string, ParseError> {
  const value = data[field];
  if (value === undefined || value === null) {
    return Err({ message: `Missing required field: ${field}`, field });
  }
  if (typeof value !== "string") {
    return Err({ message: `Field "${field}" must be a string, got ${typeof value}`, field });
  }
  return Ok(value);
}

export class MarketAggregator {
  private readonly onSnapshot?: (snapshot: MarketSnapshot) => void;
  private readonly auditStore?: AuditStore;
  private lastCycleErrors: string[] = [];

  constructor(options?: {
    onSnapshot?: (snapshot: MarketSnapshot) => void;
    auditStore?: AuditStore;
  }) {
    this.onSnapshot = options?.onSnapshot;
    this.auditStore = options?.auditStore;
  }

  parsePayload(raw: RawPayload): Result<MarketSnapshot, ParseError> {
    const data = raw.data;

    const zoneIdResult = requireString(data, "zoneId");
    if (!zoneIdResult.ok) return zoneIdResult;

    const listingDensityResult = requireNumber(data, "listingDensity");
    if (!listingDensityResult.ok) return listingDensityResult;

    const pricePerSqftRTMResult = requireNumber(data, "pricePerSqftRTM");
    if (!pricePerSqftRTMResult.ok) return pricePerSqftRTMResult;

    const pricePerSqftUCResult = requireNumber(data, "pricePerSqftUC");
    if (!pricePerSqftUCResult.ok) return pricePerSqftUCResult;

    const searchVolumeResult = requireNumber(data, "searchVolume");
    if (!searchVolumeResult.ok) return searchVolumeResult;

    const activeRentalListingsResult = requireNumber(data, "activeRentalListings");
    if (!activeRentalListingsResult.ok) return activeRentalListingsResult;

    const rentedListingsResult = requireNumber(data, "rentedListings");
    if (!rentedListingsResult.ok) return rentedListingsResult;

    const activeRentalListings = activeRentalListingsResult.value;
    const rentedListings = rentedListingsResult.value;
    const rentalAbsorptionRate =
      activeRentalListings === 0 ? 0 : rentedListings / activeRentalListings;

    const id = contentHash(data);

    const snapshot: MarketSnapshot = {
      id,
      zoneId: zoneIdResult.value,
      sourceId: raw.sourceId,
      cycleTimestamp: raw.fetchedAt,
      listingDensity: listingDensityResult.value,
      pricePerSqftRTM: pricePerSqftRTMResult.value,
      pricePerSqftUC: pricePerSqftUCResult.value,
      searchVolume: searchVolumeResult.value,
      activeRentalListings,
      rentedListings,
      rentalAbsorptionRate,
      ingestedAt: new Date().toISOString(),
      schemaVersion: "1.0",
    };

    return Ok(snapshot);
  }

  deduplicateListings(snapshots: MarketSnapshot[]): MarketSnapshot[] {
    const seen = new Map<string, MarketSnapshot>();
    for (const snapshot of snapshots) {
      if (!seen.has(snapshot.id)) {
        seen.set(snapshot.id, snapshot);
      }
    }
    return Array.from(seen.values());
  }

  async runCycle(source: MarketSourceConfig): Promise<IngestResult> {
    const errors: string[] = [];
    const snapshots: MarketSnapshot[] = [];

    let response: Response;
    try {
      response = await fetch(source.endpoint, {
        headers: { Authorization: `Bearer ${source.authCredentialRef}` },
      });
    } catch (e) {
      const msg = `Source ${source.id} (${source.endpoint}) fetch error: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
      this.lastCycleErrors = errors;
      return { success: false, recordsIngested: 0, errors };
    }

    if (!response.ok) {
      const msg = `Source ${source.id} (${source.endpoint}) HTTP ${response.status}${response.status === 429 ? " (rate-limited)" : ""}`;
      console.error(msg);
      errors.push(msg);
      this.lastCycleErrors = errors;
      return { success: false, recordsIngested: 0, errors };
    }

    let zoneDataArray: Record<string, unknown>[];
    try {
      const body = await response.json() as unknown;
      if (!Array.isArray(body)) {
        const msg = `Source ${source.id}: expected JSON array, got ${typeof body}`;
        console.error(msg);
        errors.push(msg);
        this.lastCycleErrors = errors;
        return { success: false, recordsIngested: 0, errors };
      }
      zoneDataArray = body as Record<string, unknown>[];
    } catch (e) {
      const msg = `Source ${source.id}: failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
      this.lastCycleErrors = errors;
      return { success: false, recordsIngested: 0, errors };
    }

    const fetchedAt = new Date().toISOString();

    for (const zoneData of zoneDataArray) {
      const raw: RawPayload = {
        sourceId: source.id,
        zoneId: typeof zoneData["zoneId"] === "string" ? zoneData["zoneId"] : "",
        data: zoneData,
        fetchedAt,
      };

      const result = this.parsePayload(raw);
      if (result.ok) {
        snapshots.push(result.value);
        this.onSnapshot?.(result.value);
      } else {
        const msg = `Parse failure for zone in source ${source.id}: ${result.error.message}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    const unique = this.deduplicateListings(snapshots);

    this.lastCycleErrors = errors;
    return {
      success: errors.length === 0,
      recordsIngested: unique.length,
      errors,
    };
  }

  getErrors(): readonly string[] {
    return this.lastCycleErrors;
  }
}

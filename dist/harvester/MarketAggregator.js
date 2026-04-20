import { createHash } from "crypto";
import { Ok, Err } from "../types/index.js";
function contentHash(data) {
    return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
function requireNumber(data, field) {
    const value = data[field];
    if (value === undefined || value === null) {
        return Err({ message: `Missing required field: ${field}`, field });
    }
    if (typeof value !== "number") {
        return Err({ message: `Field "${field}" must be a number, got ${typeof value}`, field });
    }
    return Ok(value);
}
function requireString(data, field) {
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
    onSnapshot;
    auditStore;
    lastCycleErrors = [];
    constructor(options) {
        this.onSnapshot = options?.onSnapshot;
        this.auditStore = options?.auditStore;
    }
    parsePayload(raw) {
        const data = raw.data;
        const zoneIdResult = requireString(data, "zoneId");
        if (!zoneIdResult.ok)
            return zoneIdResult;
        const listingDensityResult = requireNumber(data, "listingDensity");
        if (!listingDensityResult.ok)
            return listingDensityResult;
        const pricePerSqftRTMResult = requireNumber(data, "pricePerSqftRTM");
        if (!pricePerSqftRTMResult.ok)
            return pricePerSqftRTMResult;
        const pricePerSqftUCResult = requireNumber(data, "pricePerSqftUC");
        if (!pricePerSqftUCResult.ok)
            return pricePerSqftUCResult;
        const searchVolumeResult = requireNumber(data, "searchVolume");
        if (!searchVolumeResult.ok)
            return searchVolumeResult;
        const activeRentalListingsResult = requireNumber(data, "activeRentalListings");
        if (!activeRentalListingsResult.ok)
            return activeRentalListingsResult;
        const rentedListingsResult = requireNumber(data, "rentedListings");
        if (!rentedListingsResult.ok)
            return rentedListingsResult;
        const activeRentalListings = activeRentalListingsResult.value;
        const rentedListings = rentedListingsResult.value;
        const rentalAbsorptionRate = activeRentalListings === 0 ? 0 : rentedListings / activeRentalListings;
        const id = contentHash(data);
        const snapshot = {
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
    deduplicateListings(snapshots) {
        const seen = new Map();
        for (const snapshot of snapshots) {
            if (!seen.has(snapshot.id)) {
                seen.set(snapshot.id, snapshot);
            }
        }
        return Array.from(seen.values());
    }
    async runCycle(source) {
        const errors = [];
        const snapshots = [];
        let response;
        try {
            response = await fetch(source.endpoint, {
                headers: { Authorization: `Bearer ${source.authCredentialRef}` },
            });
        }
        catch (e) {
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
        let zoneDataArray;
        try {
            const body = await response.json();
            if (!Array.isArray(body)) {
                const msg = `Source ${source.id}: expected JSON array, got ${typeof body}`;
                console.error(msg);
                errors.push(msg);
                this.lastCycleErrors = errors;
                return { success: false, recordsIngested: 0, errors };
            }
            zoneDataArray = body;
        }
        catch (e) {
            const msg = `Source ${source.id}: failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`;
            console.error(msg);
            errors.push(msg);
            this.lastCycleErrors = errors;
            return { success: false, recordsIngested: 0, errors };
        }
        const fetchedAt = new Date().toISOString();
        for (const zoneData of zoneDataArray) {
            const raw = {
                sourceId: source.id,
                zoneId: typeof zoneData["zoneId"] === "string" ? zoneData["zoneId"] : "",
                data: zoneData,
                fetchedAt,
            };
            const result = this.parsePayload(raw);
            if (result.ok) {
                snapshots.push(result.value);
                this.onSnapshot?.(result.value);
            }
            else {
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
    getErrors() {
        return this.lastCycleErrors;
    }
}
//# sourceMappingURL=MarketAggregator.js.map
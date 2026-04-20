import { createHash } from "crypto";
import { Ok, Err } from "../types/index.js";
const VALID_DECLARATION_TYPES = [
    "infrastructure_tender",
    "public_works",
    "clu_change",
    "metro_line",
    "highway",
];
function isValidDeclarationType(value) {
    return VALID_DECLARATION_TYPES.includes(value);
}
function isISODate(value) {
    if (!value)
        return false;
    const d = new Date(value);
    return !isNaN(d.getTime()) && value.trim().length > 0;
}
function contentHash(content) {
    const data = typeof content === "string" ? content : content.toString("utf8");
    return createHash("sha256").update(data).digest("hex");
}
function parseHTML(content) {
    // Try JSON-LD script tags first
    const jsonLdMatch = content.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
        try {
            const parsed = JSON.parse(jsonLdMatch[1]);
            const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
            if (candidate && (candidate.zoneId || candidate.zone_id)) {
                return {
                    zoneId: candidate.zoneId ?? candidate.zone_id,
                    declarationType: candidate.declarationType ?? candidate.declaration_type,
                    declaredDate: candidate.declaredDate ?? candidate.declared_date,
                    projectedCompletionDate: candidate.projectedCompletionDate ?? candidate.projected_completion_date ?? null,
                };
            }
        }
        catch {
            // fall through
        }
    }
    // Try meta tags
    const metaZone = content.match(/<meta[^>]+name=["']zone[^"']*["'][^>]+content=["']([^"']+)["']/i);
    const metaType = content.match(/<meta[^>]+name=["']declaration[^"']*type["'][^>]+content=["']([^"']+)["']/i);
    const metaDate = content.match(/<meta[^>]+name=["']declared[^"']*date["'][^>]+content=["']([^"']+)["']/i);
    const metaCompletion = content.match(/<meta[^>]+name=["']projected[^"']*completion["'][^>]+content=["']([^"']+)["']/i);
    if (metaZone) {
        return {
            zoneId: metaZone[1],
            declarationType: metaType?.[1],
            declaredDate: metaDate?.[1],
            projectedCompletionDate: metaCompletion?.[1] ?? null,
        };
    }
    // Try data attributes
    const dataZone = content.match(/data-zone(?:-id)?=["']([^"']+)["']/i);
    const dataType = content.match(/data-declaration(?:-type)?=["']([^"']+)["']/i);
    const dataDate = content.match(/data-declared(?:-date)?=["']([^"']+)["']/i);
    const dataCompletion = content.match(/data-projected(?:-completion)?(?:-date)?=["']([^"']+)["']/i);
    if (dataZone) {
        return {
            zoneId: dataZone[1],
            declarationType: dataType?.[1],
            declaredDate: dataDate?.[1],
            projectedCompletionDate: dataCompletion?.[1] ?? null,
        };
    }
    // Fall back to text pattern matching
    const zoneMatch = content.match(/Zone\s*(?:ID\s*)?:\s*([^\s<,\n]+)/i);
    const typeMatch = content.match(/Declaration\s*Type\s*:\s*([^\s<,\n]+(?:\s+[^\s<,\n]+)*)/i);
    const dateMatch = content.match(/(?:Declared\s*)?Date\s*:\s*([^\s<,\n]+)/i);
    const completionMatch = content.match(/(?:Projected\s*)?Completion\s*(?:Date\s*)?:\s*([^\s<,\n]+)/i);
    if (zoneMatch) {
        return {
            zoneId: zoneMatch[1],
            declarationType: typeMatch?.[1]?.trim(),
            declaredDate: dateMatch?.[1],
            projectedCompletionDate: completionMatch?.[1] ?? null,
        };
    }
    return {};
}
function parseJSON(content) {
    const parsed = JSON.parse(content);
    return {
        zoneId: parsed.zoneId,
        declarationType: parsed.declarationType,
        declaredDate: parsed.declaredDate,
        projectedCompletionDate: parsed.projectedCompletionDate ?? null,
    };
}
function parsePDF(content) {
    // PDF content is pre-extracted text — use same text pattern matching as HTML fallback
    const zoneMatch = content.match(/Zone\s*(?:ID\s*)?:\s*([^\s,\n]+)/i);
    const typeMatch = content.match(/Declaration\s*Type\s*:\s*([^\n,]+)/i);
    const dateMatch = content.match(/(?:Declared\s*)?Date\s*:\s*([^\s,\n]+)/i);
    const completionMatch = content.match(/(?:Projected\s*)?Completion\s*(?:Date\s*)?:\s*([^\s,\n]+)/i);
    return {
        zoneId: zoneMatch?.[1],
        declarationType: typeMatch?.[1]?.trim(),
        declaredDate: dateMatch?.[1],
        projectedCompletionDate: completionMatch?.[1] ?? null,
    };
}
export class MunicipalParser {
    onDeclaration;
    auditStore;
    failedDocuments = [];
    constructor(options) {
        this.onDeclaration = options?.onDeclaration;
        this.auditStore = options?.auditStore;
    }
    parseDocument(raw) {
        const contentStr = typeof raw.content === "string" ? raw.content : raw.content.toString("utf8");
        const id = contentHash(contentStr);
        let fields;
        try {
            if (raw.contentType === "json") {
                fields = parseJSON(contentStr);
            }
            else if (raw.contentType === "html") {
                fields = parseHTML(contentStr);
            }
            else {
                // pdf
                fields = parsePDF(contentStr);
            }
        }
        catch (e) {
            const rawRef = raw.url;
            this.failedDocuments.push(rawRef);
            return Err({
                message: `Failed to parse ${raw.contentType} document: ${e instanceof Error ? e.message : String(e)}`,
                rawRef,
            });
        }
        // Validate required fields
        if (!fields.zoneId) {
            const rawRef = raw.url;
            this.failedDocuments.push(rawRef);
            return Err({ message: "Missing required field: zoneId", field: "zoneId", rawRef });
        }
        if (!fields.declarationType) {
            const rawRef = raw.url;
            this.failedDocuments.push(rawRef);
            return Err({ message: "Missing required field: declarationType", field: "declarationType", rawRef });
        }
        if (!isValidDeclarationType(fields.declarationType)) {
            const rawRef = raw.url;
            this.failedDocuments.push(rawRef);
            return Err({
                message: `Invalid declarationType: "${fields.declarationType}". Must be one of: ${VALID_DECLARATION_TYPES.join(", ")}`,
                field: "declarationType",
                rawRef,
            });
        }
        if (!fields.declaredDate) {
            const rawRef = raw.url;
            this.failedDocuments.push(rawRef);
            return Err({ message: "Missing required field: declaredDate", field: "declaredDate", rawRef });
        }
        if (!isISODate(fields.declaredDate)) {
            const rawRef = raw.url;
            this.failedDocuments.push(rawRef);
            return Err({
                message: `Invalid ISO date for declaredDate: "${fields.declaredDate}"`,
                field: "declaredDate",
                rawRef,
            });
        }
        if (fields.projectedCompletionDate != null &&
            fields.projectedCompletionDate !== "" &&
            !isISODate(fields.projectedCompletionDate)) {
            const rawRef = raw.url;
            this.failedDocuments.push(rawRef);
            return Err({
                message: `Invalid ISO date for projectedCompletionDate: "${fields.projectedCompletionDate}"`,
                field: "projectedCompletionDate",
                rawRef,
            });
        }
        const declaration = {
            id,
            sourceUrl: raw.url,
            zoneId: fields.zoneId,
            declarationType: fields.declarationType,
            declaredDate: fields.declaredDate,
            projectedCompletionDate: fields.projectedCompletionDate != null && fields.projectedCompletionDate !== ""
                ? fields.projectedCompletionDate
                : null,
            rawDocumentRef: null,
            ingestedAt: new Date().toISOString(),
            schemaVersion: "1.0",
        };
        return Ok(declaration);
    }
    deduplicateDeclarations(records) {
        const seen = new Map();
        for (const record of records) {
            if (!seen.has(record.id)) {
                seen.set(record.id, record);
            }
        }
        return Array.from(seen.values());
    }
    async runCycle(source) {
        const errors = [];
        const declarations = [];
        const MAX_RETRIES = 3;
        const RETRY_INTERVAL_MS = 30_000;
        let response = null;
        let lastError = "";
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                response = await fetch(source.portalUrl);
                if (!response.ok) {
                    lastError = `HTTP ${response.status} ${response.statusText}`;
                    if (attempt < MAX_RETRIES) {
                        await sleep(RETRY_INTERVAL_MS);
                        continue;
                    }
                    else {
                        errors.push(`Source ${source.id} (${source.portalUrl}) marked unavailable after ${MAX_RETRIES} retries. Last error: ${lastError}`);
                        return { success: false, recordsIngested: 0, errors };
                    }
                }
                break;
            }
            catch (e) {
                lastError = e instanceof Error ? e.message : String(e);
                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_INTERVAL_MS);
                }
                else {
                    errors.push(`Source ${source.id} (${source.portalUrl}) marked unavailable after ${MAX_RETRIES} retries. Last error: ${lastError}`);
                    return { success: false, recordsIngested: 0, errors };
                }
            }
        }
        if (!response) {
            errors.push(`Source ${source.id}: no response received`);
            return { success: false, recordsIngested: 0, errors };
        }
        const contentTypeHeader = response.headers.get("content-type") ?? "";
        let docContentType = "html";
        if (contentTypeHeader.includes("application/json")) {
            docContentType = "json";
        }
        else if (contentTypeHeader.includes("application/pdf")) {
            docContentType = "pdf";
        }
        const content = await response.text();
        const raw = {
            url: source.portalUrl,
            content,
            contentType: docContentType,
        };
        const result = this.parseDocument(raw);
        if (result.ok) {
            const decl = result.value;
            declarations.push(decl);
            this.onDeclaration?.(decl);
        }
        else {
            errors.push(`Parse failure for ${source.portalUrl}: ${result.error.message}`);
            // raw ref already stored in failedDocuments by parseDocument
        }
        const unique = this.deduplicateDeclarations(declarations);
        return {
            success: errors.length === 0,
            recordsIngested: unique.length,
            errors,
        };
    }
    getFailedDocuments() {
        return this.failedDocuments;
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=MunicipalParser.js.map
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { load as yamlLoad } from "js-yaml";
import type {
  SourceConfig,
  MunicipalSourceConfig,
  MarketSourceConfig,
  ConfigDiff,
  ConfigError,
  AuditLogEntry,
} from "../types/index.js";
import { Ok, Err } from "../types/index.js";
import type { Result } from "../types/index.js";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Validates a URL is http or https */
function isValidUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Validates a 5-part cron expression (basic structural check) */
function isValidCron(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  // Each part must be a non-empty token (digits, *, /, -, ,)
  return parts.every((p) => /^[\d*,/\-]+$/.test(p));
}

// ---------------------------------------------------------------------------
// Raw config file shape
// ---------------------------------------------------------------------------

interface RawConfigFile {
  sources?: {
    municipal?: unknown[];
    market?: unknown[];
  };
}

// ---------------------------------------------------------------------------
// Per-source validation
// ---------------------------------------------------------------------------

function validateMunicipal(
  raw: Record<string, unknown>,
  index: number
): { config: MunicipalSourceConfig; errors: ConfigError[] } | { config: null; errors: ConfigError[] } {
  const errors: ConfigError[] = [];
  const prefix = `sources.municipal[${index}]`;

  if (!raw.id || typeof raw.id !== "string") {
    errors.push({ field: `${prefix}.id`, message: "Required field 'id' is missing or not a string", value: raw.id });
  }
  if (!isValidUrl(raw.portalUrl)) {
    errors.push({ field: `${prefix}.portalUrl`, message: "Required field 'portalUrl' must be a valid http/https URL", value: raw.portalUrl });
  }
  if (!isValidCron(raw.schedule)) {
    errors.push({ field: `${prefix}.schedule`, message: "Required field 'schedule' must be a valid 5-part cron expression", value: raw.schedule });
  }
  if (!Array.isArray(raw.documentTypeFilters)) {
    errors.push({ field: `${prefix}.documentTypeFilters`, message: "Required field 'documentTypeFilters' must be an array", value: raw.documentTypeFilters });
  }
  if (typeof raw.enabled !== "boolean") {
    errors.push({ field: `${prefix}.enabled`, message: "Required field 'enabled' must be a boolean", value: raw.enabled });
  }

  if (errors.length > 0) return { config: null, errors };

  return {
    config: {
      id: raw.id as string,
      portalUrl: raw.portalUrl as string,
      schedule: raw.schedule as string,
      documentTypeFilters: raw.documentTypeFilters as string[],
      enabled: raw.enabled as boolean,
    },
    errors: [],
  };
}

function validateMarket(
  raw: Record<string, unknown>,
  index: number
): { config: MarketSourceConfig; errors: ConfigError[] } | { config: null; errors: ConfigError[] } {
  const errors: ConfigError[] = [];
  const prefix = `sources.market[${index}]`;

  if (!raw.id || typeof raw.id !== "string") {
    errors.push({ field: `${prefix}.id`, message: "Required field 'id' is missing or not a string", value: raw.id });
  }
  if (!raw.sourceName || typeof raw.sourceName !== "string") {
    errors.push({ field: `${prefix}.sourceName`, message: "Required field 'sourceName' is missing or not a string", value: raw.sourceName });
  }
  if (!isValidUrl(raw.endpoint)) {
    errors.push({ field: `${prefix}.endpoint`, message: "Required field 'endpoint' must be a valid http/https URL", value: raw.endpoint });
  }
  if (!raw.authCredentialRef || typeof raw.authCredentialRef !== "string") {
    errors.push({ field: `${prefix}.authCredentialRef`, message: "Required field 'authCredentialRef' is missing or not a string", value: raw.authCredentialRef });
  }
  if (!isValidCron(raw.schedule)) {
    errors.push({ field: `${prefix}.schedule`, message: "Required field 'schedule' must be a valid 5-part cron expression", value: raw.schedule });
  }
  if (typeof raw.enabled !== "boolean") {
    errors.push({ field: `${prefix}.enabled`, message: "Required field 'enabled' must be a boolean", value: raw.enabled });
  }

  if (errors.length > 0) return { config: null, errors };

  return {
    config: {
      id: raw.id as string,
      sourceName: raw.sourceName as string,
      endpoint: raw.endpoint as string,
      authCredentialRef: raw.authCredentialRef as string,
      schedule: raw.schedule as string,
      enabled: raw.enabled as boolean,
    },
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// ConfigManager
// ---------------------------------------------------------------------------

export class ConfigManager {
  /** Currently loaded and validated sources */
  private _sources: SourceConfig[] = [];

  /** Audit log entries accumulated by this instance */
  private _auditLog: AuditLogEntry[] = [];

  /** Active fs.watch watcher, if any */
  private _watcher: fs.FSWatcher | null = null;

  // -------------------------------------------------------------------------
  // loadSources
  // -------------------------------------------------------------------------

  /**
   * Read and validate a YAML or JSON config file.
   * Returns Ok with all valid SourceConfig entries, or Err with field-level
   * ConfigErrors when any source fails validation.
   * Invalid sources are rejected; they are never applied or persisted.
   */
  loadSources(filePath: string): Result<SourceConfig[], ConfigError[]> {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      return Err([
        {
          field: "file",
          message: `Cannot read config file: ${(err as Error).message}`,
          value: filePath,
        },
      ]);
    }

    let parsed: unknown;
    const ext = path.extname(filePath).toLowerCase();
    try {
      if (ext === ".yaml" || ext === ".yml") {
        parsed = yamlLoad(raw);
      } else {
        // Default to JSON for .json and any other extension
        parsed = JSON.parse(raw);
      }
    } catch (err) {
      return Err([
        {
          field: "file",
          message: `Failed to parse config file: ${(err as Error).message}`,
          value: filePath,
        },
      ]);
    }

    const configFile = parsed as RawConfigFile;
    const allErrors: ConfigError[] = [];
    const validSources: SourceConfig[] = [];

    // Validate municipal sources
    const municipalRaw = configFile?.sources?.municipal ?? [];
    if (!Array.isArray(municipalRaw)) {
      allErrors.push({ field: "sources.municipal", message: "Expected an array", value: municipalRaw });
    } else {
      for (let i = 0; i < municipalRaw.length; i++) {
        const result = validateMunicipal(municipalRaw[i] as Record<string, unknown>, i);
        if (result.config !== null) {
          validSources.push(result.config);
        } else {
          allErrors.push(...result.errors);
        }
      }
    }

    // Validate market sources
    const marketRaw = configFile?.sources?.market ?? [];
    if (!Array.isArray(marketRaw)) {
      allErrors.push({ field: "sources.market", message: "Expected an array", value: marketRaw });
    } else {
      for (let i = 0; i < marketRaw.length; i++) {
        const result = validateMarket(marketRaw[i] as Record<string, unknown>, i);
        if (result.config !== null) {
          validSources.push(result.config);
        } else {
          allErrors.push(...result.errors);
        }
      }
    }

    if (allErrors.length > 0) {
      // Do NOT apply the config — return errors without updating internal state
      return Err(allErrors);
    }

    this._sources = validSources;
    return Ok(validSources);
  }

  // -------------------------------------------------------------------------
  // getActiveSources
  // -------------------------------------------------------------------------

  /**
   * Return all currently loaded sources of the given type that have enabled: true.
   */
  getActiveSources(type: "municipal" | "market"): SourceConfig[] {
    return this._sources.filter((s) => {
      if (!s.enabled) return false;
      if (type === "municipal") return "portalUrl" in s;
      if (type === "market") return "endpoint" in s;
      return false;
    });
  }

  // -------------------------------------------------------------------------
  // watchForChanges
  // -------------------------------------------------------------------------

  /**
   * Watch the config file at `filePath` for changes.
   * On each change event:
   *  1. Re-load and validate the file.
   *  2. If valid, compute a ConfigDiff against the previous state.
   *  3. Call the callback with the diff.
   *  4. Append a config_change AuditLogEntry.
   */
  watchForChanges(filePath: string, callback: (diff: ConfigDiff) => void): void {
    if (this._watcher) {
      this._watcher.close();
    }

    this._watcher = fs.watch(filePath, () => {
      const previousSources = [...this._sources];
      const result = this.loadSources(filePath);

      if (!result.ok) {
        // Invalid config — do not apply, do not call callback
        console.error("[ConfigManager] Config reload rejected due to validation errors:", result.error);
        return;
      }

      const nextSources = result.value;
      const diff = this._computeDiff(previousSources, nextSources);

      callback(diff);
      this._appendAuditEntry(diff);
    });
  }

  /** Stop watching for file changes */
  stopWatching(): void {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  /** Expose audit log for testing / inspection */
  getAuditLog(): AuditLogEntry[] {
    return [...this._auditLog];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _computeDiff(previous: SourceConfig[], next: SourceConfig[]): ConfigDiff {
    const prevMap = new Map(previous.map((s) => [s.id, s]));
    const nextMap = new Map(next.map((s) => [s.id, s]));

    const added: SourceConfig[] = [];
    const updated: SourceConfig[] = [];
    const removed: string[] = [];

    for (const [id, nextSource] of nextMap) {
      if (!prevMap.has(id)) {
        added.push(nextSource);
      } else {
        const prevSource = prevMap.get(id)!;
        if (JSON.stringify(prevSource) !== JSON.stringify(nextSource)) {
          updated.push(nextSource);
        }
      }
    }

    for (const [id] of prevMap) {
      if (!nextMap.has(id)) {
        removed.push(id);
      }
    }

    return { added, updated, removed };
  }

  private _appendAuditEntry(diff: ConfigDiff): void {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      eventType: "config_change",
      timestamp: new Date().toISOString(),
      actorId: "ConfigManager",
      payload: {
        added: diff.added.map((s) => s.id),
        updated: diff.updated.map((s) => s.id),
        removed: diff.removed,
      },
      correlationId: crypto.randomUUID(),
    };
    this._auditLog.push(entry);
  }
}

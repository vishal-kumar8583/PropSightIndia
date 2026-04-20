import type { SourceConfig, ConfigDiff, ConfigError, AuditLogEntry } from "../types/index.js";
import type { Result } from "../types/index.js";
export declare class ConfigManager {
    /** Currently loaded and validated sources */
    private _sources;
    /** Audit log entries accumulated by this instance */
    private _auditLog;
    /** Active fs.watch watcher, if any */
    private _watcher;
    /**
     * Read and validate a YAML or JSON config file.
     * Returns Ok with all valid SourceConfig entries, or Err with field-level
     * ConfigErrors when any source fails validation.
     * Invalid sources are rejected; they are never applied or persisted.
     */
    loadSources(filePath: string): Result<SourceConfig[], ConfigError[]>;
    /**
     * Return all currently loaded sources of the given type that have enabled: true.
     */
    getActiveSources(type: "municipal" | "market"): SourceConfig[];
    /**
     * Watch the config file at `filePath` for changes.
     * On each change event:
     *  1. Re-load and validate the file.
     *  2. If valid, compute a ConfigDiff against the previous state.
     *  3. Call the callback with the diff.
     *  4. Append a config_change AuditLogEntry.
     */
    watchForChanges(filePath: string, callback: (diff: ConfigDiff) => void): void;
    /** Stop watching for file changes */
    stopWatching(): void;
    /** Expose audit log for testing / inspection */
    getAuditLog(): AuditLogEntry[];
    private _computeDiff;
    private _appendAuditEntry;
}
//# sourceMappingURL=ConfigManager.d.ts.map
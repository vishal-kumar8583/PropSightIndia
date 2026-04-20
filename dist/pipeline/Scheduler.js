/**
 * Parses a simplified cron expression and returns the interval in milliseconds.
 *
 * Supported patterns:
 *   "* /N * * * *"  = every N minutes
 *   "0 * /N * * *"  = every N hours
 *   "0 N * * *"     = daily (every 24 hours, hour N ignored for simplicity)
 *   anything else   = default 1 hour
 */
function parseCronToMs(cron) {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5)
        return 60 * 60 * 1000; // default 1 hour
    const [minute, hour] = parts;
    // "*/N * * * *" → every N minutes
    const everyMinuteMatch = minute.match(/^\*\/(\d+)$/);
    if (everyMinuteMatch && hour === "*") {
        const n = parseInt(everyMinuteMatch[1], 10);
        return n * 60 * 1000;
    }
    // "0 */N * * *" → every N hours
    const everyHourMatch = hour.match(/^\*\/(\d+)$/);
    if (everyHourMatch && minute === "0") {
        const n = parseInt(everyHourMatch[1], 10);
        return n * 60 * 60 * 1000;
    }
    // "0 N * * *" → daily (every 24 hours)
    const dailyMatch = hour.match(/^\d+$/);
    if (dailyMatch && minute === "0") {
        return 24 * 60 * 60 * 1000;
    }
    // Default: every 1 hour
    return 60 * 60 * 1000;
}
export class Scheduler {
    pipeline;
    configManager;
    onCycleComplete;
    timers = [];
    constructor(options) {
        this.pipeline = options.pipeline;
        this.configManager = options.configManager;
        this.onCycleComplete = options.onCycleComplete;
    }
    /** Begin scheduling all configured sources based on their cron expressions. */
    start() {
        const municipalSources = this.configManager.getActiveSources("municipal");
        const marketSources = this.configManager.getActiveSources("market");
        const allSources = [...municipalSources, ...marketSources];
        if (allSources.length === 0) {
            console.log("[Scheduler] No active sources configured. Nothing to schedule.");
            return;
        }
        // Group sources by their interval to avoid redundant timers
        const intervalMap = new Map();
        for (const source of allSources) {
            const intervalMs = parseCronToMs(source.schedule);
            if (!intervalMap.has(intervalMs)) {
                intervalMap.set(intervalMs, []);
            }
            intervalMap.get(intervalMs).push(source);
        }
        for (const [intervalMs, sources] of intervalMap) {
            const sourceIds = sources.map((s) => s.id).join(", ");
            console.log(`[Scheduler] Scheduling sources [${sourceIds}] every ${intervalMs / 1000}s`);
            const timer = setInterval(() => {
                void this._executeCycle(sources);
            }, intervalMs);
            this.timers.push(timer);
        }
    }
    /** Clear all scheduled timers. */
    stop() {
        for (const timer of this.timers) {
            clearInterval(timer);
        }
        this.timers.length = 0;
        console.log("[Scheduler] All timers stopped.");
    }
    /** Trigger an immediate cycle across all active sources (useful for testing). */
    async runNow() {
        const municipalSources = this.configManager.getActiveSources("municipal");
        const marketSources = this.configManager.getActiveSources("market");
        const allSources = [...municipalSources, ...marketSources];
        await this._executeCycle(allSources);
    }
    async _executeCycle(sources) {
        const sourceIds = sources.map((s) => s.id).join(", ");
        console.log(`[Scheduler] Cycle start — sources: [${sourceIds}]`);
        const errors = [];
        let sourcesRun = 0;
        try {
            await this.pipeline.runCycle();
            sourcesRun = sources.length;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push(message);
            console.error(`[Scheduler] Cycle error: ${message}`);
        }
        console.log(`[Scheduler] Cycle end — sourcesRun: ${sourcesRun}, errors: ${errors.length}`);
        this.onCycleComplete?.({ sourcesRun, errors });
    }
}
//# sourceMappingURL=Scheduler.js.map
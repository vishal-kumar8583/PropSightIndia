import type { Pipeline } from "./Pipeline.js";
import type { ConfigManager } from "../config/ConfigManager.js";
export interface SchedulerOptions {
    pipeline: Pipeline;
    configManager: ConfigManager;
    onCycleComplete?: (result: {
        sourcesRun: number;
        errors: string[];
    }) => void;
}
export declare class Scheduler {
    private readonly pipeline;
    private readonly configManager;
    private readonly onCycleComplete?;
    private readonly timers;
    constructor(options: SchedulerOptions);
    /** Begin scheduling all configured sources based on their cron expressions. */
    start(): void;
    /** Clear all scheduled timers. */
    stop(): void;
    /** Trigger an immediate cycle across all active sources (useful for testing). */
    runNow(): Promise<void>;
    private _executeCycle;
}
//# sourceMappingURL=Scheduler.d.ts.map
import { EventBus } from "./EventBus.js";
import type { ConfigManager } from "../config/ConfigManager.js";
import type { AuditStore } from "../audit/AuditStore.js";
import type { CorrelationEngine } from "../engine/CorrelationEngine.js";
import type { TrendAnalyzer } from "../analyzer/TrendAnalyzer.js";
import type { AlertingService } from "../alerting/AlertingService.js";
import { InMemoryStore } from "../dashboard/api/store.js";
import type { NotificationChannel } from "../types/index.js";
export interface PipelineOptions {
    configManager: ConfigManager;
    auditStore: AuditStore;
    correlationEngine: CorrelationEngine;
    trendAnalyzer: TrendAnalyzer;
    alertingService: AlertingService;
    store: InMemoryStore;
    notificationChannels?: NotificationChannel[];
}
export declare class Pipeline {
    private readonly bus;
    private readonly configManager;
    private readonly auditStore;
    private readonly correlationEngine;
    private readonly trendAnalyzer;
    private readonly alertingService;
    private readonly store;
    private readonly notificationChannels;
    /** Accumulates declarations and snapshots per zone for recomputeAll calls */
    private readonly zoneSignals;
    private municipalParser;
    private marketAggregator;
    constructor(options: PipelineOptions);
    initialize(): void;
    runCycle(): Promise<void>;
    getEventBus(): EventBus;
    private getOrCreateBundle;
}
//# sourceMappingURL=Pipeline.d.ts.map
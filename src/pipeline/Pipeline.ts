import { randomUUID } from "crypto";
import { EventBus } from "./EventBus.js";
import { MunicipalParser } from "../harvester/MunicipalParser.js";
import { MarketAggregator } from "../harvester/MarketAggregator.js";
import type { ConfigManager } from "../config/ConfigManager.js";
import type { AuditStore } from "../audit/AuditStore.js";
import type { CorrelationEngine } from "../engine/CorrelationEngine.js";
import type { TrendAnalyzer } from "../analyzer/TrendAnalyzer.js";
import type { AlertingService } from "../alerting/AlertingService.js";
import { InMemoryStore } from "../dashboard/api/store.js";
import type {
  MunicipalDeclaration,
  MarketSnapshot,
  GVSResult,
  NotificationChannel,
  SignalBundle,
  MunicipalSourceConfig,
  MarketSourceConfig,
} from "../types/index.js";

export interface PipelineOptions {
  configManager: ConfigManager;
  auditStore: AuditStore;
  correlationEngine: CorrelationEngine;
  trendAnalyzer: TrendAnalyzer;
  alertingService: AlertingService;
  store: InMemoryStore;
  notificationChannels?: NotificationChannel[];
}

export class Pipeline {
  private readonly bus: EventBus;
  private readonly configManager: ConfigManager;
  private readonly auditStore: AuditStore;
  private readonly correlationEngine: CorrelationEngine;
  private readonly trendAnalyzer: TrendAnalyzer;
  private readonly alertingService: AlertingService;
  private readonly store: InMemoryStore;
  private readonly notificationChannels: NotificationChannel[];

  /** Accumulates declarations and snapshots per zone for recomputeAll calls */
  private readonly zoneSignals: Map<string, SignalBundle> = new Map();

  private municipalParser!: MunicipalParser;
  private marketAggregator!: MarketAggregator;

  constructor(options: PipelineOptions) {
    this.bus = new EventBus();
    this.configManager = options.configManager;
    this.auditStore = options.auditStore;
    this.correlationEngine = options.correlationEngine;
    this.trendAnalyzer = options.trendAnalyzer;
    this.alertingService = options.alertingService;
    this.store = options.store;
    this.notificationChannels = options.notificationChannels ?? [];
  }

  initialize(): void {
    // 1. Create MunicipalParser with onDeclaration callback
    this.municipalParser = new MunicipalParser({
      onDeclaration: (decl: MunicipalDeclaration) => {
        this.bus.emit("declaration:ingested", decl);
        this.auditStore.append({
          id: randomUUID(),
          eventType: "ingestion",
          timestamp: new Date().toISOString(),
          actorId: "MunicipalParser",
          payload: { declarationId: decl.id, zoneId: decl.zoneId, sourceUrl: decl.sourceUrl },
          correlationId: randomUUID(),
        });
      },
    });

    // 2. Create MarketAggregator with onSnapshot callback
    this.marketAggregator = new MarketAggregator({
      onSnapshot: (snapshot: MarketSnapshot) => {
        this.bus.emit("snapshot:ingested", snapshot);
        this.auditStore.append({
          id: randomUUID(),
          eventType: "ingestion",
          timestamp: new Date().toISOString(),
          actorId: "MarketAggregator",
          payload: { snapshotId: snapshot.id, zoneId: snapshot.zoneId, sourceId: snapshot.sourceId },
          correlationId: randomUUID(),
        });
      },
    });

    // 3. Subscribe to "declaration:ingested"
    this.bus.on("declaration:ingested", (decl: MunicipalDeclaration) => {
      const bundle = this.getOrCreateBundle(decl.zoneId);
      bundle.municipalDeclarations.push(decl);

      const weights = this.store.getWeightConfig();
      const zone = { id: decl.zoneId, name: decl.zoneId };
      const prev = this.store.getGVSResult(decl.zoneId) ?? null;

      const results = this.correlationEngine.recomputeAll(weights, [{ zone, signals: bundle }]);
      const next = results[0];
      if (next) {
        this.store.setGVSResult(next);
        this.bus.emit("gvs:computed", { prev, next });
      }

      // Evaluate declaration for alerts
      const alert = this.alertingService.evaluateDeclaration(decl);
      if (alert) {
        this.bus.emit("alert:generated", alert);
        void this.alertingService.dispatch(alert, this.notificationChannels);
      }
    });

    // 4. Subscribe to "snapshot:ingested"
    this.bus.on("snapshot:ingested", (snapshot: MarketSnapshot) => {
      const bundle = this.getOrCreateBundle(snapshot.zoneId);
      bundle.marketSnapshots.push(snapshot);

      const weights = this.store.getWeightConfig();
      const zone = { id: snapshot.zoneId, name: snapshot.zoneId };
      const prev = this.store.getGVSResult(snapshot.zoneId) ?? null;

      const results = this.correlationEngine.recomputeAll(weights, [{ zone, signals: bundle }]);
      const next = results[0];
      if (next) {
        this.store.setGVSResult(next);

        // Compute and store TrendResult (use TrendAnalyzer defaults: 1.0% appreciation, 0.5pp divergence)
        const trendResult = this.trendAnalyzer.computeTrendResult({
          zoneId: snapshot.zoneId,
          history: bundle.marketSnapshots,
          appreciationThreshold: 1.0,
          divergenceThreshold: 0.5,
        });
        this.store.setTrendResult(trendResult);

        this.bus.emit("gvs:computed", { prev, next });
      }
    });

    // 5. Subscribe to "gvs:computed"
    this.bus.on("gvs:computed", ({ prev, next }: { prev: GVSResult | null; next: GVSResult }) => {
      if (prev === null) return;
      const alert = this.alertingService.evaluateGVSChange(prev, next);
      if (alert) {
        this.bus.emit("alert:generated", alert);
        void this.alertingService.dispatch(alert, this.notificationChannels);
      }
    });

    // 6. Subscribe to "alert:generated"
    this.bus.on("alert:generated", (alert) => {
      this.auditStore.append({
        id: randomUUID(),
        eventType: "alert_dispatch",
        timestamp: new Date().toISOString(),
        actorId: "AlertingService",
        payload: { alertId: alert.id, zoneId: alert.zoneId, alertType: alert.alertType },
        correlationId: alert.id,
      });
    });
  }

  async runCycle(): Promise<void> {
    const municipalSources = this.configManager.getActiveSources("municipal") as MunicipalSourceConfig[];
    const marketSources = this.configManager.getActiveSources("market") as MarketSourceConfig[];

    for (const source of municipalSources) {
      await this.municipalParser.runCycle(source);
    }

    for (const source of marketSources) {
      await this.marketAggregator.runCycle(source);
    }
  }

  getEventBus(): EventBus {
    return this.bus;
  }

  private getOrCreateBundle(zoneId: string): SignalBundle {
    if (!this.zoneSignals.has(zoneId)) {
      this.zoneSignals.set(zoneId, { municipalDeclarations: [], marketSnapshots: [] });
    }
    return this.zoneSignals.get(zoneId)!;
  }
}

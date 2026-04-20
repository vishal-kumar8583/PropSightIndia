import { randomUUID } from "crypto";
import { EventBus } from "./EventBus.js";
import { MunicipalParser } from "../harvester/MunicipalParser.js";
import { MarketAggregator } from "../harvester/MarketAggregator.js";
export class Pipeline {
    bus;
    configManager;
    auditStore;
    correlationEngine;
    trendAnalyzer;
    alertingService;
    store;
    notificationChannels;
    /** Accumulates declarations and snapshots per zone for recomputeAll calls */
    zoneSignals = new Map();
    municipalParser;
    marketAggregator;
    constructor(options) {
        this.bus = new EventBus();
        this.configManager = options.configManager;
        this.auditStore = options.auditStore;
        this.correlationEngine = options.correlationEngine;
        this.trendAnalyzer = options.trendAnalyzer;
        this.alertingService = options.alertingService;
        this.store = options.store;
        this.notificationChannels = options.notificationChannels ?? [];
    }
    initialize() {
        // 1. Create MunicipalParser with onDeclaration callback
        this.municipalParser = new MunicipalParser({
            onDeclaration: (decl) => {
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
            onSnapshot: (snapshot) => {
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
        this.bus.on("declaration:ingested", (decl) => {
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
        this.bus.on("snapshot:ingested", (snapshot) => {
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
        this.bus.on("gvs:computed", ({ prev, next }) => {
            if (prev === null)
                return;
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
    async runCycle() {
        const municipalSources = this.configManager.getActiveSources("municipal");
        const marketSources = this.configManager.getActiveSources("market");
        for (const source of municipalSources) {
            await this.municipalParser.runCycle(source);
        }
        for (const source of marketSources) {
            await this.marketAggregator.runCycle(source);
        }
    }
    getEventBus() {
        return this.bus;
    }
    getOrCreateBundle(zoneId) {
        if (!this.zoneSignals.has(zoneId)) {
            this.zoneSignals.set(zoneId, { municipalDeclarations: [], marketSnapshots: [] });
        }
        return this.zoneSignals.get(zoneId);
    }
}
//# sourceMappingURL=Pipeline.js.map
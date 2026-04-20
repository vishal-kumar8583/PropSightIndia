import { randomUUID } from "crypto";
import { AuditStore } from "../audit/AuditStore.js";
const HIGH_IMPACT_TYPES = new Set(["metro_line", "highway", "clu_change"]);
const RETRY_DELAYS_MS = [1000, 2000, 4000];
export class AlertingService {
    globalThreshold;
    zoneThresholds;
    auditStore;
    emailSender;
    constructor(options = {}) {
        this.globalThreshold = options.globalThreshold ?? 10;
        this.zoneThresholds = options.zoneThresholds ?? new Map();
        this.auditStore = options.auditStore ?? new AuditStore();
        this.emailSender =
            options.emailSender ??
                (async (_to, _subject, _body) => {
                    /* no-op default */
                });
    }
    /**
     * Evaluate a GVS change and return an Alert if the delta exceeds the threshold.
     * Uses per-Zone threshold if configured, otherwise falls back to globalThreshold.
     */
    evaluateGVSChange(prev, next) {
        if (prev.score === "Insufficient Data" || next.score === "Insufficient Data") {
            return null;
        }
        const delta = next.score - prev.score;
        const threshold = this.zoneThresholds.has(next.zoneId)
            ? this.zoneThresholds.get(next.zoneId)
            : this.globalThreshold;
        if (delta <= threshold) {
            return null;
        }
        // Find the signal with the highest weightedContribution in next.signalBreakdown
        let primarySignal = "";
        let maxContribution = -Infinity;
        for (const signal of next.signalBreakdown) {
            if (signal.weightedContribution > maxContribution) {
                maxContribution = signal.weightedContribution;
                primarySignal = signal.signalName;
            }
        }
        return {
            id: randomUUID(),
            zoneId: next.zoneId,
            alertType: "gvs_change",
            payload: {
                prevScore: prev.score,
                newScore: next.score,
                primarySignal,
            },
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Evaluate a MunicipalDeclaration and return an Alert for high-impact types.
     */
    evaluateDeclaration(decl) {
        if (!HIGH_IMPACT_TYPES.has(decl.declarationType)) {
            return null;
        }
        return {
            id: randomUUID(),
            zoneId: decl.zoneId,
            alertType: "high_impact_declaration",
            payload: {
                declarationType: decl.declarationType,
                declaredDate: decl.declaredDate,
                projectedCompletionDate: decl.projectedCompletionDate,
            },
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Dispatch an alert to the given channels.
     * Retries up to 3× with exponential backoff (1s, 2s, 4s).
     * Logs a delivery_failure audit entry after exhaustion.
     */
    async dispatch(alert, channels) {
        const results = [];
        for (const channel of channels) {
            const result = await this.deliverWithRetry(alert, channel);
            results.push(result);
        }
        return results;
    }
    async deliverWithRetry(alert, channel) {
        let lastError = "";
        for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) {
                await this.sleep(RETRY_DELAYS_MS[attempt - 1]);
            }
            try {
                await this.deliverToChannel(alert, channel);
                return { success: true, channel };
            }
            catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
        }
        // All 3 attempts failed — log delivery_failure audit entry
        const auditEntry = {
            id: randomUUID(),
            eventType: "delivery_failure",
            timestamp: new Date().toISOString(),
            actorId: "AlertingService",
            payload: {
                alertId: alert.id,
                zoneId: alert.zoneId,
                channelType: channel.type,
                channelTarget: channel.target,
                error: lastError,
            },
            correlationId: alert.id,
        };
        this.auditStore.append(auditEntry);
        return { success: false, channel, error: lastError };
    }
    async deliverToChannel(alert, channel) {
        if (channel.type === "email") {
            const subject = `Alert [${alert.alertType}] for zone ${alert.zoneId}`;
            const body = JSON.stringify(alert, null, 2);
            await this.emailSender(channel.target, subject, body);
        }
        else if (channel.type === "webhook") {
            const response = await fetch(channel.target, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(alert),
            });
            if (!response.ok) {
                throw new Error(`Webhook responded with status ${response.status}`);
            }
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=AlertingService.js.map
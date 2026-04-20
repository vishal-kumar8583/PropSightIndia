import type { Alert, NotificationChannel, DeliveryResult } from "../types/index.js";
import type { GVSResult } from "../types/index.js";
import type { MunicipalDeclaration } from "../types/index.js";
import { AuditStore } from "../audit/AuditStore.js";
export interface AlertingServiceOptions {
    globalThreshold?: number;
    zoneThresholds?: Map<string, number>;
    auditStore?: AuditStore;
    emailSender?: (to: string, subject: string, body: string) => Promise<void>;
}
export declare class AlertingService {
    private readonly globalThreshold;
    private readonly zoneThresholds;
    private readonly auditStore;
    private readonly emailSender;
    constructor(options?: AlertingServiceOptions);
    /**
     * Evaluate a GVS change and return an Alert if the delta exceeds the threshold.
     * Uses per-Zone threshold if configured, otherwise falls back to globalThreshold.
     */
    evaluateGVSChange(prev: GVSResult, next: GVSResult): Alert | null;
    /**
     * Evaluate a MunicipalDeclaration and return an Alert for high-impact types.
     */
    evaluateDeclaration(decl: MunicipalDeclaration): Alert | null;
    /**
     * Dispatch an alert to the given channels.
     * Retries up to 3× with exponential backoff (1s, 2s, 4s).
     * Logs a delivery_failure audit entry after exhaustion.
     */
    dispatch(alert: Alert, channels: NotificationChannel[]): Promise<DeliveryResult[]>;
    private deliverWithRetry;
    private deliverToChannel;
    private sleep;
}
//# sourceMappingURL=AlertingService.d.ts.map
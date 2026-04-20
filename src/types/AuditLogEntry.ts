import type { ISODateString } from "./MunicipalDeclaration.js";

export interface AuditLogEntry {
  id: string;
  eventType:
    | "ingestion"
    | "computation"
    | "config_change"
    | "alert_dispatch"
    | "delivery_failure";
  timestamp: ISODateString;
  /** System component or user ID */
  actorId: string;
  payload: Record<string, unknown>;
  /** Links related events in a pipeline run */
  correlationId: string;
}

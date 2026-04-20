export type { ISODateString, MunicipalDeclaration } from "./MunicipalDeclaration.js";
export type { MarketSnapshot } from "./MarketSnapshot.js";
export type { SignalContribution, GVSResult } from "./GVSResult.js";
export type { TrendResult } from "./TrendResult.js";
export type { GVSTimeSeries } from "./GVSTimeSeries.js";
export type { WeightConfig } from "./WeightConfig.js";
export type { CronExpression, MunicipalSourceConfig, MarketSourceConfig, SourceConfig } from "./SourceConfig.js";
export type { AuditLogEntry } from "./AuditLogEntry.js";
export type { ComputationStep, LineageRecord } from "./LineageRecord.js";
export type {
  Zone,
  SignalBundle,
  IngestResult,
  Alert,
  NotificationChannel,
  DeliveryResult,
  ConfigDiff,
  ConfigError,
  ParseError,
  RawDocument,
  RawPayload,
} from "./supporting.js";
export { Ok, Err, isOk, isErr } from "./result.js";
export type { Result } from "./result.js";

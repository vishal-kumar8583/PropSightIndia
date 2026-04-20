/** Cron expression string, e.g. "0 *\/6 * * *" */
export type CronExpression = string;

export interface MunicipalSourceConfig {
  id: string;
  portalUrl: string;
  schedule: CronExpression;
  documentTypeFilters: string[];
  enabled: boolean;
}

export interface MarketSourceConfig {
  id: string;
  sourceName: string;
  endpoint: string;
  /** Reference to secrets store — not an inline credential value */
  authCredentialRef: string;
  schedule: CronExpression;
  enabled: boolean;
}

/** Union of all source config types */
export type SourceConfig = MunicipalSourceConfig | MarketSourceConfig;

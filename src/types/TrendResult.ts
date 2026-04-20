import type { ISODateString } from "./MunicipalDeclaration.js";

export interface TrendResult {
  zoneId: string;
  computedAt: ISODateString;
  /** Percentage price change per month for Ready to Move units */
  pricingVelocityRTM: number | "Insufficient History";
  /** Percentage price change per month for Under Construction units */
  pricingVelocityUC: number | "Insufficient History";
  /** Current annualized rental yield minus 6-month trailing average */
  rentalYieldDelta: number | "Insufficient History";
  flags: Array<"Appreciating" | "Undervalued">;
  rank: number | null;
}

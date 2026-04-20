import type { ISODateString } from "./MunicipalDeclaration.js";

export interface MarketSnapshot {
  /** Content-hash-based deduplication key */
  id: string;
  zoneId: string;
  sourceId: string;
  cycleTimestamp: ISODateString;
  /** Count of active listings */
  listingDensity: number;
  /** Ready to Move price, INR/sqft */
  pricePerSqftRTM: number;
  /** Under Construction price, INR/sqft */
  pricePerSqftUC: number;
  searchVolume: number;
  activeRentalListings: number;
  /** Count of listings marked rented in this cycle */
  rentedListings: number;
  /** rentedListings / activeRentalListings; 0 when denominator is 0 */
  rentalAbsorptionRate: number;
  ingestedAt: ISODateString;
  schemaVersion: string;
}

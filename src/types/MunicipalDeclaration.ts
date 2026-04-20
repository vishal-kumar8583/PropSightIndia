/** ISO 8601 date string, e.g. "2024-03-15T10:00:00Z" */
export type ISODateString = string;

export interface MunicipalDeclaration {
  /** Content-hash-based deduplication key */
  id: string;
  sourceUrl: string;
  zoneId: string;
  declarationType:
    | "infrastructure_tender"
    | "public_works"
    | "clu_change"
    | "metro_line"
    | "highway";
  declaredDate: ISODateString;
  projectedCompletionDate: ISODateString | null;
  /** Storage key for raw PDF/HTML on parse failure */
  rawDocumentRef: string | null;
  ingestedAt: ISODateString;
  schemaVersion: string;
}

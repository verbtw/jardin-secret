export type FragranceConcentration = 'Parfum' | 'Extrait' | 'EDP' | 'EDT' | 'EDC';

export interface ParsedFragrance {
  kind: 'fragrance';
  sourceRow: string;
  brand: string;
  name: string;
  flanker: string | null;
  concentration: FragranceConcentration;
  volumeMl: number;
}

export type ReviewReason = 'tester' | 'set' | 'sample' | 'refill' | 'missing_volume' | 'missing_concentration' | 'unknown_brand';

export interface ReviewRow {
  kind: 'review';
  sourceRow: string;
  reason: ReviewReason;
}

export interface RejectedRow {
  kind: 'rejected';
  sourceRow: string;
  reason: 'non_fragrance';
}

export type ParseResult = ParsedFragrance | ReviewRow | RejectedRow;

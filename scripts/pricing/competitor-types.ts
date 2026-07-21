import type {FragranceConcentration} from '../catalog/catalog-types';

export type CompetitorSource = 'randewoo' | 'goldapple';

export interface ProductVariant {
  brand: string;
  name: string;
  flanker: string | null;
  concentration: FragranceConcentration;
  volumeMl: number;
}

export interface CompetitorCandidate extends ProductVariant {
  source: CompetitorSource;
  url: string;
  priceRub: number;
  title: string;
  packaging?: 'retail' | 'tester' | 'sample' | 'refill' | 'set';
}

export interface ExactCompetitorMatch {
  source: CompetitorSource;
  url: string;
  priceRub: number;
  title: string;
  confidence: 1;
}

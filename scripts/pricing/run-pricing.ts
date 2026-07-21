import {calculateRetailPrice, type PricingReason} from '../../src/domain/pricing.js';

export interface PricingProduct {
  id: string;
  costRub: number;
  priceMode: 'auto' | 'manual';
  competitorPrices: number[];
}

export interface StoredPricingDecision {
  productId: string;
  costRub: number;
  lowestCompetitorRub: number | null;
  calculatedPriceRub: number | null;
  profitRub: number | null;
  rule: PricingReason;
  flagged: boolean;
  flagReason: string | null;
  calculatedAt: string;
}

export interface PricingRepository {
  listProductsForPricing(): Promise<PricingProduct[]>;
  saveDecision(decision: StoredPricingDecision): Promise<void>;
  saveDecisions?(decisions: StoredPricingDecision[]): Promise<void>;
  updateAutomaticPrice(productId: string, priceRub: number | null, status: 'published' | 'request'): Promise<void>;
  updateAutomaticPrices?(updates: Array<{productId: string; priceRub: number | null; status: 'published' | 'request'}>): Promise<void>;
}

export interface PricingRunSummary {
  processed: number;
  published: number;
  request: number;
  manualPreserved: number;
}

export async function runDailyPricing(
  repo: PricingRepository,
  calculatedAt = new Date().toISOString(),
): Promise<PricingRunSummary> {
  const summary: PricingRunSummary = {processed: 0, published: 0, request: 0, manualPreserved: 0};
  const products = await repo.listProductsForPricing();
  const decisions: StoredPricingDecision[] = [];
  const updates: Array<{productId: string; priceRub: number | null; status: 'published' | 'request'}> = [];

  for (const product of products) {
    const decision = calculateRetailPrice({costRub: product.costRub, competitorPrices: product.competitorPrices});
    const flagged = decision.priceRub === null;
    decisions.push({
      productId: product.id,
      costRub: product.costRub,
      lowestCompetitorRub: decision.lowestCompetitorRub,
      calculatedPriceRub: decision.priceRub,
      profitRub: decision.profitRub,
      rule: decision.reason,
      flagged,
      flagReason: flagged ? decision.reason : null,
      calculatedAt,
    });

    summary.processed += 1;
    if (product.priceMode === 'manual') {
      summary.manualPreserved += 1;
      continue;
    }

    const status = decision.priceRub === null ? 'request' : 'published';
    updates.push({productId: product.id, priceRub: decision.priceRub, status});
    summary[status] += 1;
  }

  if (repo.saveDecisions) await repo.saveDecisions(decisions);
  else for (const decision of decisions) await repo.saveDecision(decision);

  if (updates.length) {
    if (repo.updateAutomaticPrices) await repo.updateAutomaticPrices(updates);
    else for (const update of updates) await repo.updateAutomaticPrice(update.productId, update.priceRub, update.status);
  }

  return summary;
}

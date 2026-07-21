export interface PricingInput {
  costRub: number;
  competitorPrices: number[];
}

export type PricingReason = 'competitor_discount' | 'default_margin' | 'margin_below_floor';

export interface PricingDecision {
  priceRub: number | null;
  profitRub: number | null;
  lowestCompetitorRub: number | null;
  reason: PricingReason;
}

const DEFAULT_MARGIN = 5_000;
const MAX_MARGIN = 10_000;
const MIN_MARGIN = 1_500;
const MIN_COMPETITOR_DISCOUNT = 2_000;
const MAX_COMPETITOR_DISCOUNT = 3_000;

function roundHundreds(value: number) {
  return Math.round(value / 100) * 100;
}

export function calculateRetailPrice({costRub, competitorPrices}: PricingInput): PricingDecision {
  if (!Number.isFinite(costRub) || costRub <= 0) throw new Error('Supplier cost must be positive');
  const validCompetitors = competitorPrices.filter((price) => Number.isFinite(price) && price > 0);
  const lowestCompetitorRub = validCompetitors.length ? Math.min(...validCompetitors) : null;

  let priceRub: number;
  let reason: PricingReason;

  if (lowestCompetitorRub === null) {
    priceRub = roundHundreds(costRub + DEFAULT_MARGIN);
    reason = 'default_margin';
  } else {
    const lowerTarget = lowestCompetitorRub - MAX_COMPETITOR_DISCOUNT;
    const upperTarget = lowestCompetitorRub - MIN_COMPETITOR_DISCOUNT;
    const nearNormalMargin = Math.max(lowerTarget, Math.min(upperTarget, costRub + DEFAULT_MARGIN));
    const marginCapped = Math.min(nearNormalMargin, costRub + MAX_MARGIN);
    priceRub = Math.min(roundHundreds(marginCapped), Math.floor(upperTarget / 100) * 100);
    reason = 'competitor_discount';
  }

  const profitRub = priceRub - costRub;
  if (profitRub < MIN_MARGIN) {
    return {priceRub: null, profitRub: null, lowestCompetitorRub, reason: 'margin_below_floor'};
  }

  return {priceRub, profitRub, lowestCompetitorRub, reason};
}


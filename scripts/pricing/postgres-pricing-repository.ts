import postgres, {type Sql} from 'postgres';
import type {PricingProduct, PricingRepository, StoredPricingDecision} from './run-pricing.js';

interface PricingRow {
  id: string;
  cost_rub: number;
  price_mode: 'auto' | 'manual';
  competitor_prices: number[] | null;
}

export class PostgresPricingRepository implements PricingRepository {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, {max: 1, prepare: false, ssl: 'require'});
  }

  async listProductsForPricing(): Promise<PricingProduct[]> {
    const rows = await this.sql<PricingRow[]>`
      with lowest_cost as (
        select product_id, min(cost_rub)::integer as cost_rub
        from private.supplier_offers
        where in_stock and parse_status = 'matched' and product_id is not null
        group by product_id
      ), current_competitors as (
        select product_id, array_agg(price_rub order by price_rub) as competitor_prices
        from private.competitor_offers
        where exact_match and observed_at >= now() - interval '36 hours'
        group by product_id
      )
      select p.id::text, c.cost_rub, p.price_mode,
        coalesce(o.competitor_prices, array[]::integer[]) as competitor_prices
      from public.products p
      join lowest_cost c on c.product_id = p.id
      left join current_competitors o on o.product_id = p.id
      where p.availability <> 'out_of_stock'
      order by p.id
    `;
    return rows.map((row) => ({
      id: row.id,
      costRub: Number(row.cost_rub),
      priceMode: row.price_mode,
      competitorPrices: (row.competitor_prices ?? []).map(Number),
    }));
  }

  async saveDecision(decision: StoredPricingDecision) {
    await this.sql`
      insert into private.pricing_decisions (
        product_id, cost_rub, lowest_competitor_rub, calculated_price_rub,
        profit_rub, rule, inputs, flagged, flag_reason, created_at
      ) values (
        ${decision.productId}, ${decision.costRub}, ${decision.lowestCompetitorRub},
        ${decision.calculatedPriceRub}, ${decision.profitRub}, ${decision.rule},
        ${this.sql.json({calculatedAt: decision.calculatedAt})}, ${decision.flagged},
        ${decision.flagReason}, ${decision.calculatedAt}
      )
    `;
  }

  async updateAutomaticPrice(productId: string, priceRub: number | null, status: 'published' | 'request') {
    await this.sql`
      update public.products set
        auto_price_rub = ${priceRub},
        price_status = ${status},
        price_updated_at = now()
      where id = ${productId} and price_mode = 'auto'
    `;
  }

  async close() {
    await this.sql.end({timeout: 5});
  }
}

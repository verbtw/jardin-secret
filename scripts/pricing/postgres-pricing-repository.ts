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

  async saveDecisions(decisions: StoredPricingDecision[]) {
    for (let start = 0; start < decisions.length; start += 1000) {
      const values = decisions.slice(start, start + 1000).map((decision) => ({
        product_id: decision.productId,
        cost_rub: decision.costRub,
        lowest_competitor_rub: decision.lowestCompetitorRub,
        calculated_price_rub: decision.calculatedPriceRub,
        profit_rub: decision.profitRub,
        rule: decision.rule,
        inputs: {calculatedAt: decision.calculatedAt},
        flagged: decision.flagged,
        flag_reason: decision.flagReason,
        created_at: decision.calculatedAt,
      }));
      await this.sql`
        insert into private.pricing_decisions (
          product_id, cost_rub, lowest_competitor_rub, calculated_price_rub,
          profit_rub, rule, inputs, flagged, flag_reason, created_at
        )
        select
          product_id, cost_rub, lowest_competitor_rub, calculated_price_rub,
          profit_rub, rule, inputs, flagged, flag_reason, created_at
        from jsonb_to_recordset(${this.sql.json(values)}::jsonb) as x(
          product_id uuid,
          cost_rub integer,
          lowest_competitor_rub integer,
          calculated_price_rub integer,
          profit_rub integer,
          rule text,
          inputs jsonb,
          flagged boolean,
          flag_reason text,
          created_at timestamptz
        )
      `;
    }
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

  async updateAutomaticPrices(updates: Array<{productId: string; priceRub: number | null; status: 'published' | 'request'}>) {
    for (let start = 0; start < updates.length; start += 1000) {
      const values = updates.slice(start, start + 1000).map((update) => ({
        product_id: update.productId,
        price_rub: update.priceRub,
        status: update.status,
      }));
      await this.sql`
        update public.products as product set
          auto_price_rub = update_values.price_rub,
          price_status = update_values.status,
          price_updated_at = now()
        from jsonb_to_recordset(${this.sql.json(values)}::jsonb) as update_values(
          product_id uuid,
          price_rub integer,
          status text
        )
        where product.id = update_values.product_id
          and product.price_mode = 'auto'
      `;
    }
  }

  async close() {
    await this.sql.end({timeout: 5});
  }
}

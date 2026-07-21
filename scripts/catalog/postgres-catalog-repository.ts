import postgres, { type Sql } from 'postgres';
import type { CatalogImportRepository, ImportOffer, ImportProduct, ImportSummary } from './import-catalog';

export class PostgresCatalogRepository implements CatalogImportRepository {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, {max: 1, prepare: false, ssl: 'require'});
  }

  async startRun(observedAt: string) {
    const [run] = await this.sql<{id: string}[]>`
      insert into private.import_runs (started_at)
      values (${observedAt})
      returning id::text
    `;
    return run.id;
  }

  async completeRun(runId: string, summary: ImportSummary & {exchangeRate: number; supplierCount: number}) {
    await this.sql`
      update private.import_runs set
        status = 'completed',
        exchange_rate = ${summary.exchangeRate},
        supplier_count = ${summary.supplierCount},
        source_row_count = ${summary.sourceRows},
        matched_count = ${summary.matched},
        review_count = ${summary.review},
        rejected_count = ${summary.rejected},
        finished_at = now()
      where id = ${runId}
    `;
  }

  async failRun(runId: string, errorMessage: string) {
    await this.sql`
      update private.import_runs set
        status = 'failed', error_message = ${errorMessage.slice(0, 2000)}, finished_at = now()
      where id = ${runId}
    `;
  }

  async upsertProduct(product: ImportProduct) {
    const [saved] = await this.sql<{id: string; created: boolean}[]>`
      insert into public.products (
        canonical_key, slug, brand, name, flanker, concentration,
        volume_ml, availability, last_seen_at
      ) values (
        ${product.canonicalKey}, ${product.slug}, ${product.brand}, ${product.name},
        ${product.flanker}, ${product.concentration}, ${product.volumeMl}, 'review', ${product.lastSeenAt}
      )
      on conflict (canonical_key) do update set
        brand = excluded.brand,
        name = excluded.name,
        flanker = excluded.flanker,
        concentration = excluded.concentration,
        volume_ml = excluded.volume_ml,
        last_seen_at = excluded.last_seen_at,
        availability = case
          when public.products.availability = 'out_of_stock' then 'review'
          else public.products.availability
        end
      returning id::text, (xmax = 0) as created
    `;
    return saved;
  }

  async upsertOffer(offer: ImportOffer) {
    await this.sql`
      insert into private.supplier_offers (
        product_id, import_run_id, supplier_code, source_row, source_price_usd,
        cost_rub, parse_status, parse_reason, in_stock, observed_at
      ) values (
        ${offer.productId}, ${offer.runId}, ${offer.supplierCode}, ${offer.sourceRow},
        ${offer.sourcePriceUsd}, ${offer.costRub}, ${offer.parseStatus}, ${offer.parseReason},
        true, ${offer.observedAt}
      )
      on conflict (supplier_code, source_row) do update set
        product_id = excluded.product_id,
        import_run_id = excluded.import_run_id,
        source_price_usd = excluded.source_price_usd,
        cost_rub = excluded.cost_rub,
        parse_status = excluded.parse_status,
        parse_reason = excluded.parse_reason,
        in_stock = true,
        observed_at = excluded.observed_at
    `;
  }

  async upsertOffers(offers: ImportOffer[]) {
    const columns = [
      'product_id', 'import_run_id', 'supplier_code', 'source_row', 'source_price_usd',
      'cost_rub', 'parse_status', 'parse_reason', 'in_stock', 'observed_at',
    ] as const;
    for (let start = 0; start < offers.length; start += 500) {
      const values = offers.slice(start, start + 500).map((offer) => ({
        product_id: offer.productId,
        import_run_id: offer.runId,
        supplier_code: offer.supplierCode,
        source_row: offer.sourceRow,
        source_price_usd: offer.sourcePriceUsd,
        cost_rub: offer.costRub,
        parse_status: offer.parseStatus,
        parse_reason: offer.parseReason,
        in_stock: true,
        observed_at: offer.observedAt,
      }));
      await this.sql`
        insert into private.supplier_offers ${this.sql(values, ...columns)}
        on conflict (supplier_code, source_row) do update set
          product_id = excluded.product_id,
          import_run_id = excluded.import_run_id,
          source_price_usd = excluded.source_price_usd,
          cost_rub = excluded.cost_rub,
          parse_status = excluded.parse_status,
          parse_reason = excluded.parse_reason,
          in_stock = true,
          observed_at = excluded.observed_at
      `;
    }
  }

  async markUnseenUnavailable(observedAt: string) {
    await this.sql.begin(async (transaction) => {
      await transaction`
        update private.supplier_offers set in_stock = false
        where observed_at < ${observedAt} and in_stock
      `;
      await transaction`
        update public.products set availability = 'out_of_stock'
        where (last_seen_at is null or last_seen_at < ${observedAt})
          and availability <> 'out_of_stock'
      `;
    });
  }

  async close() {
    await this.sql.end({timeout: 5});
  }
}

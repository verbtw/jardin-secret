import postgres, {type Sql} from 'postgres';
import type {FragranceDetails} from './enrich-products.js';
import type {EnrichmentProfile, EnrichmentRepository} from './run-enrichment.js';

interface ProfileRow {
  brand: string;
  name: string;
  flanker: string | null;
  concentration: string | null;
}

export class PostgresEnrichmentRepository implements EnrichmentRepository {
  private readonly sql: Sql;

  constructor(databaseUrl: string, sqlClient?: Sql) {
    this.sql = sqlClient ?? postgres(databaseUrl, {max: 1, prepare: false, ssl: 'require'});
  }

  async listMissingProfiles(limit: number): Promise<EnrichmentProfile[]> {
    const rows = await this.sql<ProfileRow[]>`
      select distinct on (lower(brand), lower(name), coalesce(lower(flanker), ''), coalesce(lower(concentration), ''))
        brand, name, flanker, concentration
      from public.products
      where details_status in ('missing', 'partial')
      order by lower(brand), lower(name), coalesce(lower(flanker), ''), coalesce(lower(concentration), ''), created_at
      limit ${limit}
    `;
    return rows.map((row) => ({brand: row.brand, name: row.name, flanker: row.flanker, concentration: row.concentration}));
  }

  async saveVerifiedProfile(profile: EnrichmentProfile, details: FragranceDetails) {
    return this.sql.begin(async (transaction) => {
      const products = await transaction<{id: string}[]>`
        update public.products set
          description = ${details.description},
          fragrance_family = ${details.fragranceFamily},
          top_notes = ${details.topNotes},
          heart_notes = ${details.heartNotes},
          base_notes = ${details.baseNotes},
          key_notes = ${details.keyNotes},
          perfumers = ${details.perfumers},
          launch_year = ${details.launchYear},
          image_url = ${details.imageUrl},
          details_source_url = ${details.sourceUrl},
          details_status = 'verified',
          availability = case when exists (
            select 1 from private.supplier_offers offer
            where offer.product_id = public.products.id and offer.in_stock
          ) then 'in_stock' else availability end,
          published = true
        where lower(brand) = lower(${profile.brand})
          and lower(name) = lower(${profile.name})
          and coalesce(lower(flanker), '') = coalesce(lower(${profile.flanker ?? null}), '')
          and coalesce(lower(concentration), '') = coalesce(lower(${profile.concentration}), '')
          and details_status <> 'verified'
        returning id::text
      `;
      const fields = [
        'description', 'fragrance_family', 'top_notes', 'heart_notes', 'base_notes',
        'key_notes', 'perfumers', 'launch_year', 'image_url',
      ];
      const confidence = details.sourceType === 'official_brand' ? 1
        : details.sourceType === 'official_distributor' ? 0.9 : 0.8;
      for (const product of products) {
        await transaction`
          insert into private.product_sources (
            product_id, source_type, source_url, fields, confidence, observed_at
          ) values (
            ${product.id}, ${details.sourceType}, ${details.sourceUrl}, ${fields}, ${confidence}, now()
          )
          on conflict (product_id, source_url) do update set
            source_type = excluded.source_type,
            fields = excluded.fields,
            confidence = excluded.confidence,
            observed_at = excluded.observed_at
        `;
      }
      return products.length;
    });
  }

  async markProfileForReview(profile: EnrichmentProfile) {
    await this.sql`
      update public.products set details_status = 'review'
      where lower(brand) = lower(${profile.brand})
        and lower(name) = lower(${profile.name})
        and coalesce(lower(flanker), '') = coalesce(lower(${profile.flanker ?? null}), '')
        and coalesce(lower(concentration), '') = coalesce(lower(${profile.concentration}), '')
        and details_status in ('missing', 'partial')
    `;
  }

  async close() {
    await this.sql.end({timeout: 5});
  }
}

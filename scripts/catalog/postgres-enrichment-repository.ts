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

  async saveVerifiedProfiles(items: Array<{profile: EnrichmentProfile; details: FragranceDetails}>) {
    let updatedCount = 0;
    for (let start = 0; start < items.length; start += 500) {
      const payload = items.slice(start, start + 500).map(({profile, details}) => ({
        brand: profile.brand,
        name: profile.name,
        flanker: profile.flanker ?? null,
        concentration: profile.concentration,
        description: details.description,
        fragrance_family: details.fragranceFamily,
        top_notes: details.topNotes,
        heart_notes: details.heartNotes,
        base_notes: details.baseNotes,
        key_notes: details.keyNotes,
        perfumers: details.perfumers,
        launch_year: details.launchYear,
        image_url: details.imageUrl,
        source_url: details.sourceUrl,
        source_type: details.sourceType,
      }));
      const rows = await this.sql<{product_id: string}[]>`
        with profiles as (
          select * from jsonb_to_recordset(${this.sql.json(payload)}::jsonb) as profile (
            brand text, name text, flanker text, concentration text,
            description text, fragrance_family text,
            top_notes jsonb, heart_notes jsonb, base_notes jsonb, key_notes jsonb,
            perfumers jsonb, launch_year integer, image_url text,
            source_url text, source_type text
          )
        ), updated as (
          update public.products product set
            description = profile.description,
            fragrance_family = profile.fragrance_family,
            top_notes = array(select jsonb_array_elements_text(profile.top_notes)),
            heart_notes = array(select jsonb_array_elements_text(profile.heart_notes)),
            base_notes = array(select jsonb_array_elements_text(profile.base_notes)),
            key_notes = array(select jsonb_array_elements_text(profile.key_notes)),
            perfumers = array(select jsonb_array_elements_text(profile.perfumers)),
            launch_year = profile.launch_year,
            image_url = profile.image_url,
            details_source_url = profile.source_url,
            details_status = 'verified',
            availability = case when exists (
              select 1 from private.supplier_offers offer
              where offer.product_id = product.id and offer.in_stock
            ) then 'in_stock' else product.availability end,
            published = true
          from profiles profile
          where lower(product.brand) = lower(profile.brand)
            and lower(product.name) = lower(profile.name)
            and coalesce(lower(product.flanker), '') = coalesce(lower(profile.flanker), '')
            and coalesce(lower(product.concentration), '') = coalesce(lower(profile.concentration), '')
            and product.details_status <> 'verified'
          returning product.id, product.brand, product.name, product.flanker, product.concentration
        )
        insert into private.product_sources (
          product_id, source_type, source_url, fields, confidence, observed_at
        )
        select
          updated.id, profile.source_type, profile.source_url,
          array['description', 'fragrance_family', 'top_notes', 'heart_notes', 'base_notes',
            'key_notes', 'perfumers', 'launch_year', 'image_url'],
          case profile.source_type
            when 'official_brand' then 1
            when 'official_distributor' then 0.9
            else 0.8
          end,
          now()
        from updated
        join profiles profile
          on lower(updated.brand) = lower(profile.brand)
          and lower(updated.name) = lower(profile.name)
          and coalesce(lower(updated.flanker), '') = coalesce(lower(profile.flanker), '')
          and coalesce(lower(updated.concentration), '') = coalesce(lower(profile.concentration), '')
        on conflict (product_id, source_url) do update set
          source_type = excluded.source_type,
          fields = excluded.fields,
          confidence = excluded.confidence,
          observed_at = excluded.observed_at
        returning product_id::text
      `;
      updatedCount += rows.length;
    }
    return updatedCount;
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

  async markProfilesForReview(profiles: EnrichmentProfile[]) {
    for (let start = 0; start < profiles.length; start += 1_000) {
      const payload = profiles.slice(start, start + 1_000).map((profile) => ({
        brand: profile.brand,
        name: profile.name,
        flanker: profile.flanker ?? null,
        concentration: profile.concentration,
      }));
      await this.sql`
        with profiles as (
          select * from jsonb_to_recordset(${this.sql.json(payload)}::jsonb) as profile (
            brand text, name text, flanker text, concentration text
          )
        )
        update public.products product set details_status = 'review'
        from profiles profile
        where lower(product.brand) = lower(profile.brand)
          and lower(product.name) = lower(profile.name)
          and coalesce(lower(product.flanker), '') = coalesce(lower(profile.flanker), '')
          and coalesce(lower(product.concentration), '') = coalesce(lower(profile.concentration), '')
          and product.details_status in ('missing', 'partial')
      `;
    }
  }

  async close() {
    await this.sql.end({timeout: 5});
  }
}

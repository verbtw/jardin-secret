alter table public.products
  add column gender text not null default 'unknown'
  check (gender in ('women', 'men', 'unisex', 'unknown'));

grant select (gender) on public.products to anon, authenticated;

create or replace view public.public_catalog
with (security_invoker = true)
as
select
  id, slug, brand, name, flanker, concentration, volume_ml,
  case
    when price_mode = 'manual' then manual_price_rub
    else auto_price_rub
  end as retail_price_rub,
  price_status, availability, description, fragrance_family,
  top_notes, heart_notes, base_notes, key_notes, key_accords,
  perfumers, launch_year, image_url, details_source_url,
  details_status, updated_at, gender
from public.products
where published;

revoke all on public.public_catalog from public, anon, authenticated;
grant select on public.public_catalog to anon, authenticated;

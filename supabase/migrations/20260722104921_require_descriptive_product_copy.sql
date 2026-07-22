alter table public.products
  drop constraint products_published_details_complete,
  add constraint products_published_details_complete
  check (
    not published or (
      details_status = 'verified'
      and char_length(btrim(description)) >= 60
      and coalesce(char_length(btrim(fragrance_family)), 0) > 0
      and cardinality(top_notes || heart_notes || base_notes || key_notes) > 0
      and coalesce(image_url ~ '^https://', false)
      and coalesce(details_source_url ~ '^https://', false)
    )
  );

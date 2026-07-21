create index if not exists pricing_decisions_import_run_idx
  on private.pricing_decisions (import_run_id);

create index if not exists reviews_user_idx
  on public.reviews (user_id);

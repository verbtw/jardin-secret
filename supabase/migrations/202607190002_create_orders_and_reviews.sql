create type public.order_status as enum ('pending', 'completed', 'cancelled');
create type public.review_status as enum ('pending', 'published', 'rejected');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_code text not null unique check (public_code ~ '^JS-[A-Z0-9]{6}$'),
  status public.order_status not null default 'pending',
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  product_id text,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 20 and 1500),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.reviews enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.reviews from anon, authenticated;
grant select, insert on public.orders to authenticated;
grant select, insert on public.reviews to authenticated;
grant select (id, product_id, rating, body, status, created_at) on public.reviews to anon;

create policy "orders_select_own" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "orders_insert_pending_own" on public.orders for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');

create policy "reviews_select_published" on public.reviews for select to anon, authenticated using (status = 'published');
create policy "reviews_select_own" on public.reviews for select to authenticated using ((select auth.uid()) = user_id);
create policy "reviews_insert_after_completed_order" on public.reviews for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and exists (
    select 1 from public.orders
    where orders.id = reviews.order_id
      and orders.user_id = (select auth.uid())
      and orders.status = 'completed'
  )
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index reviews_status_created_idx on public.reviews (status, created_at desc);
create index reviews_product_idx on public.reviews (product_id) where status = 'published';

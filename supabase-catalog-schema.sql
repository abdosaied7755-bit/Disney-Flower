-- Run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text not null default '',
  parent_id uuid references public.categories(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Safe migration for projects that already have the categories table.
alter table public.categories add column if not exists parent_id uuid references public.categories(id) on delete cascade;
create index if not exists categories_parent_id_idx on public.categories(parent_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  unit text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  image_url text not null default '',
  is_active boolean not null default true,
  is_special_offer boolean not null default false,
  created_at timestamptz not null default now()
);

-- Safe migration for projects that already have the products table.
alter table public.products add column if not exists is_special_offer boolean not null default false;
alter table public.products add column if not exists old_price numeric(12,2) check (old_price is null or old_price >= 0);

alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "public can read active categories" on public.categories;
drop policy if exists "public can read active products" on public.products;
drop policy if exists "public can read products" on public.products;
drop policy if exists "authenticated can manage categories" on public.categories;
drop policy if exists "authenticated can manage products" on public.products;
create policy "public can read active categories" on public.categories for select using (is_active = true);
-- Inactive products remain visible so the storefront can show an unavailable card.
create policy "public can read products" on public.products for select using (true);

-- The current dashboard uses its existing admin password. Replace these policies
-- with Supabase Auth based policies before exposing write access publicly.
create policy "authenticated can manage categories" on public.categories for all to authenticated using (true) with check (true);
create policy "authenticated can manage products" on public.products for all to authenticated using (true) with check (true);

-- Enable live catalog updates for storefront visitors (safe to run repeatedly).
do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public can view product images" on storage.objects;
drop policy if exists "authenticated can upload product images" on storage.objects;
create policy "public can view product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "authenticated can upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');

-- Visitor counter used by the storefront and admin dashboard.
create table if not exists public.visitor_stats (
  id integer primary key check (id = 1),
  total bigint not null default 0,
  daily bigint not null default 0,
  monthly bigint not null default 0,
  day_key date not null default current_date,
  month_key text not null default to_char(current_date, 'YYYY-MM'),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitor_presence (
  visitor_id text primary key,
  last_active timestamptz not null default now()
);

-- One row per customer and calendar day prevents duplicate counts across
-- sessions and devices when the customer has a stable authenticated id.
create table if not exists public.visitor_daily (
  customer_id text not null,
  day_key date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (customer_id, day_key)
);

alter table public.visitor_stats enable row level security;
alter table public.visitor_presence enable row level security;
alter table public.visitor_daily enable row level security;

drop policy if exists "public can read visitor stats" on public.visitor_stats;
create policy "public can read visitor stats" on public.visitor_stats for select using (true);
drop policy if exists "public can read visitor presence" on public.visitor_presence;
create policy "public can read visitor presence" on public.visitor_presence for select using (true);
drop policy if exists "public can update visitor presence" on public.visitor_presence;
create policy "public can update visitor presence" on public.visitor_presence for insert with check (true);
drop policy if exists "public can refresh visitor presence" on public.visitor_presence;
create policy "public can refresh visitor presence" on public.visitor_presence for update using (true) with check (true);

insert into public.visitor_stats (id) values (1) on conflict (id) do nothing;

drop function if exists public.track_visitor(boolean);
create or replace function public.track_visitor(
  p_customer_id text,
  p_count boolean default true
)
returns public.visitor_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.visitor_stats;
  was_added boolean := false;
begin
  if p_customer_id is null or length(trim(p_customer_id)) < 8 then
    raise exception 'A stable customer id is required';
  end if;

  if p_count then
    insert into public.visitor_daily (customer_id, day_key)
    values (trim(p_customer_id), current_date)
    on conflict (customer_id, day_key) do nothing;
    was_added := found;
  end if;

  insert into public.visitor_stats (id) values (1) on conflict (id) do nothing;
  update public.visitor_stats
  set
    total = case when was_added then total + 1 else total end,
    daily = case when day_key = current_date then
      case when was_added then daily + 1 else daily end
      else case when was_added then 1 else 0 end end,
    monthly = case when month_key = to_char(current_date, 'YYYY-MM') then
      case when was_added then monthly + 1 else monthly end
      else case when was_added then 1 else 0 end end,
    day_key = current_date,
    month_key = to_char(current_date, 'YYYY-MM'),
    updated_at = now()
  where id = 1
  returning * into result;
  return result;
end;
$$;

grant execute on function public.track_visitor(text, boolean) to anon, authenticated;

-- Admin cleanup is performed server-side; the client never receives delete
-- access to the visitor tables.
revoke all on table public.visitor_daily from anon, authenticated;
grant select on table public.visitor_stats to anon, authenticated;
grant select, insert, update on table public.visitor_presence to anon, authenticated;

drop function if exists public.reset_visitor_data(text);
create or replace function public.reset_visitor_data(p_admin_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  password_hash constant text := '7283666badabdf8d8f2718867ffa0bfcbc5bd005e7d5a9e69f5799125dedc0c4';
  removed_daily bigint;
  removed_presence bigint;
begin
  if encode(extensions.digest(convert_to(coalesce(p_admin_password, ''), 'UTF8'), 'sha256'), 'hex') <> password_hash then
    raise exception 'Invalid admin password' using errcode = '28000';
  end if;

  select count(*) into removed_daily from public.visitor_daily;
  select count(*) into removed_presence from public.visitor_presence;
  truncate table public.visitor_daily, public.visitor_presence;
  update public.visitor_stats
  set total = 0, daily = 0, monthly = 0,
      day_key = current_date, month_key = to_char(current_date, 'YYYY-MM'),
      updated_at = now()
  where id = 1;

  return json_build_object('daily_rows', removed_daily, 'presence_rows', removed_presence);
end;
$$;

revoke all on function public.reset_visitor_data(text) from public;
grant execute on function public.reset_visitor_data(text) to anon, authenticated;

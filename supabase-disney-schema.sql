-- Disney Flowers & Gifts - independent Supabase schema
-- Run this file in the Disney Supabase project before supabase-disney-seed.sql.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Safe catalog migration for the older Market Online tables.
alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists updated_at timestamptz not null default now();
create unique index if not exists categories_slug_unique_idx
  on public.categories (slug) where slug is not null;
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  unit text not null default 'قطعة',
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= price),
  image_url text,
  product_type text,
  occasion text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  is_special_offer boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);
-- Add Disney product fields to an existing catalog without deleting products.
alter table public.products add column if not exists description text;
alter table public.products add column if not exists product_type text;
alter table public.products add column if not exists occasion text;
alter table public.products add column if not exists stock_quantity integer not null default 0;
alter table public.products add column if not exists is_featured boolean not null default false;
alter table public.products add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'products_category_name_unique_idx'
  )
  and not exists (
    select category_id, name
    from public.products
    group by category_id, name
    having count(*) > 1
  ) then
    create unique index products_category_name_unique_idx
      on public.products (category_id, name);
  end if;
end $$;
create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  customer_name text not null,
  customer_email text,
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 3 and 2000),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('DIS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_address text not null,
  gift_message text,
  delivery_date date,
  delivery_slot text,
  delivery_instructions text,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  payment_method text not null default 'cash_on_delivery',
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  gift_option text,
  created_at timestamptz not null default now()
);
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- Compatibility migration: if the supplied project still has the legacy
-- visitor tables, keep them under legacy_* names and create Disney tables below.
-- This does not delete old rows and keeps Disney analytics isolated.
do $$
begin
  if to_regclass('public.visitor_stats') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'visitor_stats' and column_name = 'visitor_id'
     )
     and to_regclass('public.legacy_visitor_stats') is null then
    alter table public.visitor_stats rename to legacy_visitor_stats;
  end if;
  if to_regclass('public.visitor_daily') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'visitor_daily' and column_name = 'visit_date'
     )
     and to_regclass('public.legacy_visitor_daily') is null then
    alter table public.visitor_daily rename to legacy_visitor_daily;
  end if;
  if to_regclass('public.visitor_presence') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'visitor_presence' and column_name = 'page_path'
     )
     and to_regclass('public.legacy_visitor_presence') is null then
    alter table public.visitor_presence rename to legacy_visitor_presence;
  end if;
end $$;
create table if not exists public.visitor_stats (
  visitor_id text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  total_visits integer not null default 1 check (total_visits >= 1)
);
create table if not exists public.visitor_daily (
  visit_date date primary key default current_date,
  visits integer not null default 0 check (visits >= 0),
  unique_visitors integer not null default 0 check (unique_visitors >= 0)
);
create table if not exists public.visitor_presence (
  visitor_id text primary key,
  page_path text,
  last_seen_at timestamptz not null default now()
);

create index if not exists categories_active_order_idx on public.categories (is_active, sort_order);
create index if not exists products_category_active_idx on public.products (category_id, is_active);
create index if not exists products_offer_idx on public.products (is_special_offer, is_active);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists reviews_published_idx on public.customer_reviews (is_published, created_at desc);
create index if not exists visitor_daily_date_idx on public.visitor_daily (visit_date desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists reviews_set_updated_at on public.customer_reviews;
create trigger reviews_set_updated_at before update on public.customer_reviews for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.track_visitor(p_visitor_id text, p_page_path text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  is_new boolean;
  total_count integer;
  today_count integer;
begin
  if p_visitor_id is null or char_length(trim(p_visitor_id)) < 8 then raise exception 'Invalid visitor identifier'; end if;
  insert into public.visitor_stats(visitor_id)
  values (left(trim(p_visitor_id), 120))
  on conflict (visitor_id) do update set last_seen_at = now(), total_visits = public.visitor_stats.total_visits + 1
  returning (xmax = 0) into is_new;
  insert into public.visitor_daily(visit_date, visits, unique_visitors)
  values (current_date, 1, case when is_new then 1 else 0 end)
  on conflict (visit_date) do update set visits = public.visitor_daily.visits + 1,
    unique_visitors = public.visitor_daily.unique_visitors + case when is_new then 1 else 0 end;
  insert into public.visitor_presence(visitor_id, page_path, last_seen_at)
  values (left(trim(p_visitor_id), 120), p_page_path, now())
  on conflict (visitor_id) do update set page_path = excluded.page_path, last_seen_at = now();
  select coalesce(sum(total_visits), 0)::integer into total_count from public.visitor_stats;
  select coalesce(visits, 0)::integer into today_count from public.visitor_daily where visit_date = current_date;
  return jsonb_build_object('total_visits', total_count, 'today_visits', today_count);
end;
$$;

create or replace function public.touch_visitor_presence(p_visitor_id text, p_page_path text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor_id is null or char_length(trim(p_visitor_id)) < 8 then return; end if;
  insert into public.visitor_presence(visitor_id, page_path, last_seen_at)
  values (left(trim(p_visitor_id), 120), p_page_path, now())
  on conflict (visitor_id) do update set page_path = excluded.page_path, last_seen_at = now();
end;
$$;

drop function if exists public.reset_visitor_data(text);

create or replace function public.reset_visitor_data(p_admin_password text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  password_hash constant text := 'd4a3fe7939571109815e391f735d32771f03fc42aab7440bb7cd774359f7168e';
  total_rows integer;
  daily_rows integer;
  presence_rows integer;
begin
  if not public.is_admin_user() then
    raise exception 'Admin permission required' using errcode = '42501';
  end if;
  if encode(extensions.digest(convert_to(coalesce(p_admin_password, ''), 'UTF8'), 'sha256'), 'hex') <> password_hash then
    raise exception 'Invalid visitor reset password' using errcode = '28000';
  end if;

  delete from public.visitor_stats where true;
  get diagnostics total_rows = row_count;
  delete from public.visitor_daily where true;
  get diagnostics daily_rows = row_count;
  delete from public.visitor_presence where true;
  get diagnostics presence_rows = row_count;

  return jsonb_build_object(
    'total_rows', total_rows,
    'daily_rows', daily_rows,
    'presence_rows', presence_rows
  );
end;
$$;
alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customer_reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.favorites enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.visitor_stats enable row level security;
alter table public.visitor_daily enable row level security;
alter table public.visitor_presence enable row level security;

drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users for select using (user_id = auth.uid() or public.is_admin_user());
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_admin_user());
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists catalog_public_read on public.categories;
create policy catalog_public_read on public.categories for select using (is_active = true or public.is_admin_user());
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (is_active = true or public.is_admin_user());

drop policy if exists reviews_public_read on public.customer_reviews;
create policy reviews_public_read on public.customer_reviews for select using (is_published = true or public.is_admin_user());
drop policy if exists reviews_self_insert on public.customer_reviews;
create policy reviews_self_insert on public.customer_reviews for insert with check (customer_id = auth.uid()::text);
drop policy if exists reviews_self_update on public.customer_reviews;
create policy reviews_self_update on public.customer_reviews for update using (customer_id = auth.uid()::text) with check (customer_id = auth.uid()::text);

drop policy if exists orders_self_select on public.orders;
create policy orders_self_select on public.orders for select using (user_id = auth.uid() or public.is_admin_user());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update using (public.is_admin_user()) with check (public.is_admin_user());
drop policy if exists orders_items_self_select on public.order_items;
create policy orders_items_self_select on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin_user())));
drop policy if exists favorites_self_all on public.favorites;
create policy favorites_self_all on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists newsletter_public_insert on public.newsletter_subscribers;
create policy newsletter_public_insert on public.newsletter_subscribers for insert with check (char_length(email) between 5 and 320);
drop policy if exists newsletter_admin_read on public.newsletter_subscribers;
create policy newsletter_admin_read on public.newsletter_subscribers for select using (public.is_admin_user());

drop policy if exists visitor_stats_admin_read on public.visitor_stats;
create policy visitor_stats_admin_read on public.visitor_stats for select using (public.is_admin_user());
drop policy if exists visitor_daily_admin_read on public.visitor_daily;
create policy visitor_daily_admin_read on public.visitor_daily for select using (public.is_admin_user());
drop policy if exists visitor_presence_admin_read on public.visitor_presence;
create policy visitor_presence_admin_read on public.visitor_presence for select using (public.is_admin_user());

do $$
declare table_name text;
begin
  foreach table_name in array array['categories','products','customer_reviews','orders','order_items'] loop
    execute format('drop policy if exists %I_admin_all on public.%I', table_name, table_name);
    execute format('create policy %I_admin_all on public.%I for all using (public.is_admin_user()) with check (public.is_admin_user())', table_name, table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin_user());
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update using (bucket_id = 'product-images' and public.is_admin_user()) with check (bucket_id = 'product-images' and public.is_admin_user());
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin_user());

create or replace function public.create_order_with_items(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_address text,
  p_gift_message text,
  p_delivery_date date,
  p_delivery_slot text,
  p_delivery_instructions text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  item jsonb;
  product_row public.products%rowtype;
  quantity integer;
  calculated_subtotal numeric(12,2) := 0;
  delivery_fee numeric(12,2) := 20;
  new_order public.orders%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if coalesce(jsonb_array_length(p_items), 0) = 0 then raise exception 'Cart is empty'; end if;

  insert into public.orders(user_id, customer_name, customer_phone, customer_email, delivery_address,
    gift_message, delivery_date, delivery_slot, delivery_instructions, subtotal, delivery_fee, total)
  values (current_user_id, trim(p_customer_name), trim(p_customer_phone), nullif(trim(p_customer_email), ''),
    trim(p_delivery_address), nullif(trim(p_gift_message), ''), p_delivery_date, nullif(trim(p_delivery_slot), ''),
    nullif(trim(p_delivery_instructions), ''), 0, delivery_fee, 0)
  returning * into new_order;

  for item in select * from jsonb_array_elements(p_items) loop
    quantity := greatest(1, (item ->> 'quantity')::integer);
    select * into product_row from public.products
      where id = (item ->> 'product_id')::uuid and is_active = true
      for update;
    if not found then raise exception 'Product is unavailable'; end if;
    if product_row.stock_quantity < quantity then raise exception 'Insufficient stock for %', product_row.name; end if;

    calculated_subtotal := calculated_subtotal + product_row.price * quantity;
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity, gift_option)
    values (new_order.id, product_row.id, product_row.name, product_row.price, quantity, item ->> 'gift_option');
    update public.products set stock_quantity = stock_quantity - quantity where id = product_row.id;
  end loop;

  update public.orders set subtotal = calculated_subtotal, total = calculated_subtotal + delivery_fee
    where id = new_order.id
    returning * into new_order;
  return jsonb_build_object('id', new_order.id, 'order_number', new_order.order_number,
    'subtotal', new_order.subtotal, 'total', new_order.total);
end;
$$;

grant execute on function public.track_visitor(text,text) to anon, authenticated;
grant execute on function public.touch_visitor_presence(text,text) to anon, authenticated;
grant execute on function public.is_admin_user() to anon, authenticated;
grant execute on function public.reset_visitor_data(text) to authenticated;

grant execute on function public.create_order_with_items(text,text,text,text,text,date,text,text,jsonb) to authenticated;

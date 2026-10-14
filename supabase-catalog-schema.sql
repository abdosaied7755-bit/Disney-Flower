-- Run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  unit text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

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

-- Secure identity and admin roles.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());

drop function if exists public.handle_new_user();
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do update set name = excluded.name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop function if exists public.is_admin();
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- Replace broad authenticated catalog write access with admin-only access.
drop policy if exists "authenticated can manage categories" on public.categories;
drop policy if exists "authenticated can manage products" on public.products;
drop policy if exists "admins can manage categories" on public.categories;
drop policy if exists "admins can manage products" on public.products;
create policy "admins can manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins can manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated can upload product images" on storage.objects;
drop policy if exists "admins can manage product images" on storage.objects;
create policy "admins can manage product images" on storage.objects for all to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

-- Orders are created through the server-side RPC below, so prices cannot be trusted from the browser.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated by default as identity unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 20 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit text not null default '',
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 100),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
drop policy if exists "customers can read own orders" on public.orders;
drop policy if exists "admins can read all orders" on public.orders;
drop policy if exists "admins can update all orders" on public.orders;
drop policy if exists "customers can read own order items" on public.order_items;
drop policy if exists "admins can read all order items" on public.order_items;
create policy "customers can read own orders" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "admins can read all orders" on public.orders for select to authenticated using (public.is_admin());
create policy "admins can update all orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "customers can read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admins can read all order items" on public.order_items for select to authenticated using (public.is_admin());

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
grant select on table public.orders, public.order_items to authenticated;
grant update(status, updated_at) on table public.orders to authenticated;

drop function if exists public.create_order(text, text, text, jsonb);
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item_count integer;
  v_unique_count integer;
  v_valid_count integer;
  v_subtotal numeric(12,2);
  v_delivery_fee numeric(12,2) := 20;
  v_total numeric(12,2);
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then raise exception 'Customer name is required'; end if;
  if trim(coalesce(p_customer_phone, '')) !~ '^01[0-2,5][0-9]{8}$' then raise exception 'A valid Egyptian phone number is required'; end if;
  if length(trim(coalesce(p_customer_address, ''))) < 8 then raise exception 'Customer address is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one order item is required'; end if;

  select count(*), count(distinct item.product_id)
  into v_item_count, v_unique_count
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer);
  if v_item_count <> v_unique_count then raise exception 'Duplicate order items are not allowed'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer) where item.quantity is null or item.quantity < 1 or item.quantity > 100) then raise exception 'Invalid item quantity'; end if;

  select count(*), coalesce(sum(p.price * item.quantity), 0)::numeric(12,2)
  into v_valid_count, v_subtotal
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  join public.products p on p.id = item.product_id and p.is_active = true;
  if v_valid_count <> v_item_count then raise exception 'One or more products are unavailable'; end if;

  v_total := v_subtotal + v_delivery_fee;
  insert into public.orders (user_id, customer_name, customer_phone, customer_address, subtotal, delivery_fee, total)
  values (auth.uid(), trim(p_customer_name), trim(p_customer_phone), trim(p_customer_address), v_subtotal, v_delivery_fee, v_total)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit, unit_price, quantity, line_total)
  select v_order_id, p.id, p.name, p.unit, p.price, item.quantity, (p.price * item.quantity)::numeric(12,2)
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  join public.products p on p.id = item.product_id and p.is_active = true;

  return (select o from public.orders o where o.id = v_order_id);
end;
$$;
revoke all on function public.create_order(text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, jsonb) to anon, authenticated;

-- Visitor cleanup is now protected by the authenticated admin role, not a password shipped to the browser.
drop function if exists public.reset_visitor_data(text);
drop function if exists public.reset_visitor_data();
create or replace function public.reset_visitor_data()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_daily bigint;
  removed_presence bigint;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select count(*) into removed_daily from public.visitor_daily;
  select count(*) into removed_presence from public.visitor_presence;
  truncate table public.visitor_daily, public.visitor_presence;
  update public.visitor_stats set total = 0, daily = 0, monthly = 0, day_key = current_date, month_key = to_char(current_date, 'YYYY-MM'), updated_at = now() where id = 1;
  return json_build_object('daily_rows', removed_daily, 'presence_rows', removed_presence);
end;
$$;
revoke all on function public.reset_visitor_data() from public;
grant execute on function public.reset_visitor_data() to authenticated;

-- After the first admin account is created, run this once with its auth user id:
-- update public.profiles set role = 'admin' where id = 'YOUR-AUTH-USER-UUID';
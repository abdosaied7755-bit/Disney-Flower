-- Run this once in the Supabase SQL Editor after the existing Disney schema.
create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 180),
  body text not null default '',
  image_url text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_published boolean not null default true,
  likes integer not null default 0 check (likes >= 0),
  dislikes integer not null default 0 check (dislikes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_events_valid_period check (end_at > start_at)
);

alter table public.live_events enable row level security;

drop policy if exists "public can read published live events" on public.live_events;
drop policy if exists "admin can manage live events" on public.live_events;

create policy "public can read published live events"
  on public.live_events for select
  to anon, authenticated
  using (is_published = true);

create policy "admin can manage live events"
  on public.live_events for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create table if not exists public.live_event_reactions (
  event_id uuid not null references public.live_events(id) on delete cascade,
  visitor_id text not null check (char_length(trim(visitor_id)) between 8 and 160),
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, visitor_id)
);

alter table public.live_event_reactions enable row level security;
revoke all on table public.live_event_reactions from anon, authenticated;

create or replace function public.react_live_event(
  p_event_id uuid,
  p_visitor_id text,
  p_reaction text
)
returns public.live_events
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_reaction text;
  result public.live_events;
begin
  if p_reaction not in ('like', 'dislike') then
    raise exception 'Invalid reaction';
  end if;

  if p_visitor_id is null or char_length(trim(p_visitor_id)) < 8 then
    raise exception 'A stable visitor id is required';
  end if;

  if not exists (
    select 1 from public.live_events
    where id = p_event_id and is_published = true
  ) then
    raise exception 'Live event is unavailable';
  end if;

  select reaction into previous_reaction
  from public.live_event_reactions
  where event_id = p_event_id and visitor_id = trim(p_visitor_id);

  if previous_reaction is null then
    insert into public.live_event_reactions (event_id, visitor_id, reaction)
    values (p_event_id, trim(p_visitor_id), p_reaction);
    update public.live_events
    set likes = likes + case when p_reaction = 'like' then 1 else 0 end,
        dislikes = dislikes + case when p_reaction = 'dislike' then 1 else 0 end,
        updated_at = now()
    where id = p_event_id;
  elsif previous_reaction <> p_reaction then
    update public.live_event_reactions
    set reaction = p_reaction, updated_at = now()
    where event_id = p_event_id and visitor_id = trim(p_visitor_id);
    update public.live_events
    set likes = likes + case when p_reaction = 'like' then 1 else -1 end,
        dislikes = dislikes + case when p_reaction = 'dislike' then 1 else -1 end,
        updated_at = now()
    where id = p_event_id;
  end if;

  select * into result from public.live_events where id = p_event_id;
  return result;
end;
$$;

grant select on public.live_events to anon, authenticated;
grant execute on function public.react_live_event(uuid, text, text) to anon, authenticated;

-- Disney Flower: apply this once in the Supabase SQL Editor.
-- The browser sends the password; only its SHA-256 hash is stored here.
create or replace function public.reset_visitor_data(p_admin_password text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
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

grant execute on function public.reset_visitor_data(text) to authenticated;
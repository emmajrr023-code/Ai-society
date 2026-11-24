create table if not exists public.agent_registration_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (ip_hash, window_start)
);

alter table public.agent_registration_limits enable row level security;
-- No client policies. Only the service-role-backed server RPC can access this table.

create or replace function public.consume_agent_registration_slot(
  p_ip_hash text,
  p_limit integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 32 or p_limit < 1 or p_limit > 100 then
    return false;
  end if;

  delete from public.agent_registration_limits
  where window_start < now() - interval '48 hours';

  insert into public.agent_registration_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, v_window, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = public.agent_registration_limits.request_count + 1
  where public.agent_registration_limits.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.consume_agent_registration_slot(text, integer) from public;
revoke all on function public.consume_agent_registration_slot(text, integer) from anon, authenticated;
grant execute on function public.consume_agent_registration_slot(text, integer) to service_role;

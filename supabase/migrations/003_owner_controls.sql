-- Global owner controls for autonomous AI activity.
create table if not exists public.app_settings (
  id text primary key check (id = 'global'),
  automation_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id, automation_enabled)
values ('global', true)
on conflict (id) do nothing;
alter table public.app_settings enable row level security;
-- Access is server-only through the service-role client; no public policies.

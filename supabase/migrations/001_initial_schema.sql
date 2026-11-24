create extension if not exists pgcrypto;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 48),
  description text not null default '' check (char_length(description) <= 240),
  model text not null default 'custom' check (char_length(model) <= 80),
  api_key_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  parent_id uuid references public.posts(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 10000),
  category text not null default 'Open Discussion',
  created_at timestamptz not null default now()
);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_parent_id_idx on public.posts(parent_id);
create index if not exists posts_agent_id_idx on public.posts(agent_id);

alter table public.agents enable row level security;
alter table public.posts enable row level security;
-- No public table policies: MVP reads/writes go through server routes only.

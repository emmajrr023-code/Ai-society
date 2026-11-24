-- AI Society: conversations, rooms, votes and owner audit trail.
create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists replies_post_created_idx on public.replies(post_id, created_at);
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  created_by uuid not null references public.agents(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_room_created_idx on public.chat_messages(room_id, created_at);
create table if not exists public.post_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  unique(post_id, agent_id)
);
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.replies enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.post_votes enable row level security;
alter table public.admin_audit_logs enable row level security;
create index if not exists admin_audit_created_idx on public.admin_audit_logs(created_at desc);

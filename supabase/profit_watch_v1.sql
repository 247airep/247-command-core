create schema if not exists profit_watch;

create table if not exists profit_watch.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  external_ref text,
  created_at timestamptz not null default now()
);

create table if not exists profit_watch.imports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profit_watch.clients(id) on delete cascade,
  source_name text,
  as_of_date date,
  row_count integer not null default 0 check (row_count >= 0),
  mapped_fields jsonb not null default '[]'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists profit_watch.signals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profit_watch.clients(id) on delete cascade,
  import_id uuid references profit_watch.imports(id) on delete set null,
  agreement_id text not null,
  signal_type text not null,
  priority text not null check (priority in ('PRIORITY','REVIEW','WATCH')),
  score integer not null check (score between 0 and 100),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW')),
  title text not null,
  evidence jsonb not null default '[]'::jsonb,
  unknowns jsonb not null default '[]'::jsonb,
  recommended_investigation text not null,
  potential_exposure numeric,
  impact_label text,
  created_at timestamptz not null default now()
);

create table if not exists profit_watch.outcomes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profit_watch.clients(id) on delete cascade,
  signal_id uuid not null references profit_watch.signals(id) on delete cascade,
  agreement_id text not null,
  baseline jsonb not null check (jsonb_typeof(baseline) = 'object'),
  management_decision text,
  action_taken text,
  outcome jsonb,
  economic_impact numeric,
  attribution text not null default 'UNKNOWN' check (attribution in ('OBSERVED_ONLY','CONTRIBUTED','STRONGLY_ATTRIBUTABLE','NOT_ATTRIBUTABLE','UNKNOWN')),
  status text not null default 'OPEN' check (status in ('OPEN','CLOSED')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists profit_watch_signals_client_priority_idx on profit_watch.signals(client_id, priority, score desc);
create index if not exists profit_watch_outcomes_client_status_idx on profit_watch.outcomes(client_id, status);

alter table profit_watch.clients enable row level security;
alter table profit_watch.imports enable row level security;
alter table profit_watch.signals enable row level security;
alter table profit_watch.outcomes enable row level security;

revoke all on schema profit_watch from anon, authenticated;
revoke all on all tables in schema profit_watch from anon, authenticated;

create policy "deny anon authenticated" on profit_watch.clients for all to anon, authenticated using (false) with check (false);
create policy "deny anon authenticated" on profit_watch.imports for all to anon, authenticated using (false) with check (false);
create policy "deny anon authenticated" on profit_watch.signals for all to anon, authenticated using (false) with check (false);
create policy "deny anon authenticated" on profit_watch.outcomes for all to anon, authenticated using (false) with check (false);

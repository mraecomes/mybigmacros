create table osm_aliases (
  id uuid primary key default gen_random_uuid(),
  osm_name text not null unique,
  chain_name text not null,
  created_at timestamptz default now()
);

alter table osm_aliases enable row level security;

create policy "Public read access for osm_aliases"
  on osm_aliases for select
  using (true);

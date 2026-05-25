-- chains table: one row per fast food chain.
-- Stores the Supabase Storage logo URL and the chain's primary food category.
-- chain_name must match chain_name in menu_items exactly.
-- No FK constraint to menu_items — menu_items is a static import table that cannot be altered.

create table if not exists chains (
  id uuid primary key default gen_random_uuid(),
  chain_name text not null unique,
  logo_url text,
  primary_category text,
  created_at timestamptz default now()
);

-- comment documents the intentional absence of a FK constraint
comment on column chains.chain_name is
  'Must match chain_name in menu_items exactly. No FK constraint — menu_items is static.';

alter table chains enable row level security;

create policy "Public read access for chains"
  on chains for select
  using (true);

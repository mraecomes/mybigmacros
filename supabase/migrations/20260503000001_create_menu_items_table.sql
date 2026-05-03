create table menu_items (
  id uuid primary key default gen_random_uuid(),
  chain_name text not null,
  item_name text not null,
  category text,
  calories integer,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  serving_size text,
  notes text,
  created_at timestamptz default now()
);

alter table menu_items enable row level security;

create policy "Public read access for menu_items"
  on menu_items for select
  using (true);

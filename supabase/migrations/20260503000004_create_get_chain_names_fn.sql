-- Returns all distinct chain names from menu_items.
-- Used by the chain matcher fuzzy search to build the Fuse.js index.
-- Returns only 95 rows (one per chain), safely under PostgREST's 1000-row default limit.
create or replace function get_chain_names()
returns table (chain_name text)
language sql
security invoker
set search_path = public
as $$
  select distinct chain_name from menu_items order by chain_name;
$$;

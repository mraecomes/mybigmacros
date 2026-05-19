-- Returns all distinct non-null category values from menu_items, ordered alphabetically.
-- Used by the Browse screen category grid.
-- Category count is well under PostgREST's 1000-row limit, but an RPC is used for
-- consistency with get_chain_names() and to guarantee correctness regardless of row limits.
create or replace function get_categories()
returns table (category text)
language sql
security invoker
set search_path = public
as $$
  select distinct category from menu_items where category is not null order by category;
$$;

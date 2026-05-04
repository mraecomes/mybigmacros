-- Observed in real Overpass results (Phoenix AZ): OSM uses "Einstein Bros. Bagels"
-- with a period after Bros. Existing alias "Einstein Bros Bagels" (no period) misses this variant.
insert into osm_aliases (osm_name, chain_name) values
  ('Einstein Bros. Bagels', 'Einstein Bros');

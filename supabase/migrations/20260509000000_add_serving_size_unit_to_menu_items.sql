-- Add serving_size_unit column to menu_items
-- This column stores the unit string from the original MenuStat XLS
-- (e.g. "g", "oz", "fl oz", "ml") that was not captured in the initial import.
-- Populated by scripts/menustat_update_serving_unit.js after this migration is applied.
alter table menu_items add column if not exists serving_size_unit text;

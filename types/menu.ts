export type MenuItem = {
  id: string;
  chain_name: string;
  item_name: string;
  category: string | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  serving_size: string | null;
  serving_size_unit: string | null;
  notes: string | null;
  created_at: string;
};

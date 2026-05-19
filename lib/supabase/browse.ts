import { supabase } from './client';
import type { MenuItem } from '@/types/menu';

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_categories');
  if (error) {
    throw new Error('Could not load categories. Please check your connection and try again.');
  }
  return (data as { category: string }[] ?? []).map((row) => row.category);
}

export async function fetchAllChains(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_chain_names');
  if (error) {
    throw new Error('Could not load restaurants. Please check your connection and try again.');
  }
  const chains = (data as { chain_name: string }[] ?? []).map((row) => row.chain_name);
  return chains.sort((a, b) => a.localeCompare(b));
}

export type CategoryItemsResult = {
  items: MenuItem[];
  totalCount: number;
};

export async function fetchCategoryItems(
  category: string,
  page: number,
  pageSize: number,
  searchQuery?: string
): Promise<CategoryItemsResult> {
  const isSearching = typeof searchQuery === 'string' && searchQuery.length >= 3;

  if (isSearching) {
    const { data, count, error } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact' })
      .eq('category', category)
      .ilike('item_name', `%${searchQuery}%`)
      .order('calories', { ascending: true, nullsFirst: false })
      .order('item_name', { ascending: true });

    if (error) {
      throw new Error(
        `Could not search ${category} items. Please check your connection and try again.`
      );
    }
    return { items: (data ?? []) as MenuItem[], totalCount: count ?? 0 };
  }

  const start = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact' })
    .eq('category', category)
    .order('calories', { ascending: true, nullsFirst: false })
    .order('item_name', { ascending: true })
    .range(start, start + pageSize - 1);

  if (error) {
    throw new Error(
      `Could not load ${category} items. Please check your connection and try again.`
    );
  }
  return { items: (data ?? []) as MenuItem[], totalCount: count ?? 0 };
}

export type ItemSearchResult = {
  items: MenuItem[];
  totalCount: number;
};

export async function searchMenuItems(
  query: string,
  page: number,
  pageSize: number
): Promise<ItemSearchResult> {
  const start = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact' })
    .ilike('item_name', `%${query}%`)
    .order('item_name', { ascending: true })
    .range(start, start + pageSize - 1);

  if (error) {
    throw new Error('Search failed. Please check your connection and try again.');
  }
  return { items: (data ?? []) as MenuItem[], totalCount: count ?? 0 };
}

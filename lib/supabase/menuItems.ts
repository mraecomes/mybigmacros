import { supabase } from './client';
import type { MenuItem } from '@/types/menu';

export async function fetchMenuItems(chainName: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('chain_name', chainName)
    .order('category', { ascending: true, nullsFirst: false })
    .order('item_name', { ascending: true });

  if (error) {
    throw new Error(`Could not load menu for ${chainName}. Please check your connection and try again.`);
  }

  return (data ?? []) as MenuItem[];
}

export async function fetchMenuItem(id: string): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Could not load this item. Please check your connection and try again.');
  }

  return data as MenuItem;
}

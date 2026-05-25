import { supabase } from './client';

export type ChainData = {
  chain_name: string;
  logo_url: string | null;
  primary_category: string | null;
};

export async function fetchChainsBatch(chainNames: string[]): Promise<ChainData[]> {
  if (chainNames.length === 0) return [];
  const { data, error } = await supabase
    .from('chains')
    .select('chain_name, logo_url, primary_category')
    .in('chain_name', chainNames);

  if (error) {
    throw new Error('Could not load chain data. Please check your connection and try again.');
  }

  return (data ?? []) as ChainData[];
}

export async function fetchChainByName(chainName: string): Promise<ChainData | null> {
  const { data, error } = await supabase
    .from('chains')
    .select('chain_name, logo_url, primary_category')
    .eq('chain_name', chainName)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Could not load chain data. Please check your connection and try again.');
  }

  return data as ChainData;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'last_search_params';

type LastSearchParams = {
  lat: number;
  lng: number;
  radiusMiles: number;
};

export async function setLastSearchParams(params: LastSearchParams): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(params));
  } catch {
    // Best-effort — never block the UI on a storage failure
  }
}

export async function getLastSearchParams(): Promise<LastSearchParams | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).lat !== 'number' ||
      typeof (parsed as Record<string, unknown>).lng !== 'number' ||
      typeof (parsed as Record<string, unknown>).radiusMiles !== 'number'
    ) {
      return null;
    }
    return parsed as LastSearchParams;
  } catch {
    return null;
  }
}

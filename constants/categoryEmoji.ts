// Maps menu_items.category values (exact strings from the MenuStat import) to display emoji.
// Used as the chain-level fallback when logo_url is null or fails to load.
// Keys must match the 12 distinct category values in menu_items exactly.

export const CATEGORY_EMOJI: Record<string, string> = {
  'Beverages': '🥤',
  'Toppings & Ingredients': '🧀',
  'Entrees': '🍽️',
  'Appetizers & Sides': '🍗',
  'Sandwiches': '🥪',
  'Desserts': '🍦',
  'Pizza': '🍕',
  'Salads': '🥗',
  'Baked Goods': '🥐',
  'Burgers': '🍔',
  'Soup': '🥣',
  'Fried Potatoes': '🍟',
};

export const DEFAULT_EMOJI = '🍔';

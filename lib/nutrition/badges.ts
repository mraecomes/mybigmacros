import type { MenuItem } from '@/types/menu';

export type BadgeResult = {
  proteinHit: boolean;
  fiberFuel: boolean;
};

export function evaluateBadges(
  item: Pick<MenuItem, 'calories' | 'protein_g' | 'fiber_g'>
): BadgeResult {
  const { calories, protein_g, fiber_g } = item;

  // Missing calories → ineligible for both (cannot confirm < 500)
  if (calories === null) return { proteinHit: false, fiberFuel: false };

  return {
    proteinHit: protein_g !== null && protein_g >= 20 && calories < 500,
    fiberFuel: fiber_g !== null && fiber_g >= 5 && calories < 500,
  };
}

export function proteinTooltipText(protein_g: number): string {
  return `High protein (${protein_g}g) · Under 500 cal`;
}

export function fiberTooltipText(fiber_g: number): string {
  return `Good fiber (${fiber_g}g) · Under 500 cal`;
}

export const colors = {
  primary: '#C41E3A',
  secondary: '#2AF5FF',
  accent: '#FFC107',
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  badgeProtein: '#FFC107',
  badgeFiber: '#6B8F71',
  success: '#4CAF50',
  error: '#DC2626',
  warning: '#EA580C',
  border: '#2A2A2A',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const typography = {
  fontFamily: {
    display: 'Bungee_400Regular',
    body: 'Inter_400Regular',
    bodySemiBold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

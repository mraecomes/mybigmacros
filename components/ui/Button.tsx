import { colors, typography } from '@/constants/theme';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useState } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const webHoverProps =
    Platform.OS === 'web'
      ? {
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        }
      : {};

  const containerStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'primary' && hovered && styles.primaryHovered,
    variant === 'secondary' && styles.secondary,
    variant === 'secondary' && hovered && styles.secondaryHovered,
    variant === 'ghost' && styles.ghost,
    focused && styles.focused,
    disabled && styles.disabled,
  ];

  const labelStyle = [
    styles.label,
    variant === 'primary' && styles.labelPrimary,
    variant === 'secondary' && styles.labelSecondary,
    variant === 'ghost' && styles.labelGhost,
  ];

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      style={containerStyle}
      {...(webHoverProps as object)}
    >
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryHovered: {
    backgroundColor: '#a8192f',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
  },
  secondaryHovered: {
    backgroundColor: 'rgba(196,30,58,0.08)',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingHorizontal: 8,
  },
  focused: {
    borderColor: colors.secondary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.base,
  },
  labelPrimary: {
    color: colors.textPrimary,
  },
  labelSecondary: {
    color: colors.primary,
  },
  labelGhost: {
    color: colors.primary,
  },
});

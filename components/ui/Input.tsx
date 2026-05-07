import { colors, radii, spacing, typography } from '@/constants/theme';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder'>;

export function Input({ value, onChangeText, placeholder, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  const field = (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      className="outline-none"
      style={[styles.input, focused && styles.focused, style]}
      {...rest}
    />
  );

  if (Platform.OS === 'web') {
    return <View style={styles.webWrapper}>{field}</View>;
  }

  return field;
}

const styles = StyleSheet.create({
  webWrapper: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center' as const,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  focused: {
    borderColor: colors.secondary,
  },
});

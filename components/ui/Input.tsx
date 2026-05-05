import { colors, radii, spacing, typography } from '@/constants/theme';
import { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder'>;

export function Input({ value, onChangeText, placeholder, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="outline-none"
      style={[styles.input, focused && styles.focused]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
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

import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, spacing, radius, fontSize } from '../lib/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

export default function SearchBar({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={s.wrap}>
      <Search size={16} color={colors.textMuted} strokeWidth={2} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    height: 40,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    paddingVertical: 0,
  },
});

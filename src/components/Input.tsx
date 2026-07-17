import React from 'react';
import { TextInput as RNTextInput, StyleSheet, View, Text } from 'react-native';
import { colors, spacing, radius, fontSize } from '../lib/theme';
import { input as inputBase, inputPill } from '../lib/sharedStyles';

type Props = React.ComponentProps<typeof RNTextInput> & {
  variant?: 'default' | 'pill';
  prefix?: string;
};

export default function Input({ variant = 'default', prefix, style, ...rest }: Props) {
  const base = variant === 'pill' ? inputPill : inputBase;

  if (prefix) {
    return (
      <View style={[s.prefixRow, base, style]}>
        <Text style={s.prefix}>{prefix}</Text>
        <RNTextInput
          style={s.prefixInput}
          placeholderTextColor={colors.textMuted}
          {...rest}
        />
      </View>
    );
  }

  return (
    <RNTextInput
      style={[base, style]}
      placeholderTextColor={colors.textMuted}
      {...rest}
    />
  );
}

const s = StyleSheet.create({
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 0,
  },
  prefix: {
    paddingLeft: spacing.lg,
    fontSize: fontSize.body,
    color: colors.accent,
    fontWeight: '600',
  },
  prefixInput: {
    flex: 1,
    padding: spacing.lg,
    paddingLeft: spacing.sm,
    color: colors.text,
    fontSize: fontSize.body,
  },
});

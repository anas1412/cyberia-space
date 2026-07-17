import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

const PRESETS = ['#E8A840','#E06050','#5090D0','#50B080','#C060D0','#D08040','#40A0B0','#90A030'];

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.presetRow}>
        {PRESETS.map(c => (
          <TouchableOpacity key={c} onPress={() => onChange(c)} activeOpacity={0.7}
            style={[s.presetDot, { backgroundColor: c }, value === c && s.presetSelected]} />
        ))}
      </View>

      <View style={s.previewRow}>
        <View style={[s.preview, { backgroundColor: value }]} />
        <View style={s.hexRow}>
          <Text style={s.hash}>#</Text>
          <TextInput
            style={s.hexInput}
            value={value.replace('#', '').toUpperCase()}
            onChangeText={v => {
              const clean = v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
              if (clean.length === 6) onChange('#' + clean);
            }}
            maxLength={6}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="E8A840"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.md, alignItems: 'center' },

  presetRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  presetDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2.5, borderColor: 'transparent',
  },
  presetSelected: {
    borderColor: colors.text,
    transform: [{ scale: 1.15 }],
  },

  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  preview: {
    width: 44, height: 44, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.borderStrong,
  },
  hexRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.elevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md, height: 44,
  },
  hash: { color: colors.textSecondary, fontSize: fontSize.body, fontWeight: fontWeight.medium },
  hexInput: {
    color: colors.text, fontSize: fontSize.body, fontWeight: fontWeight.semibold,
    paddingVertical: 0, paddingHorizontal: spacing.xs,
    minWidth: 80, textAlign: 'center',
  },
});

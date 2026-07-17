import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { colors, spacing, fontSize } from '../lib/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
}

export default function ChatInput({ value, onChangeText, onSend, placeholder }: Props) {
  const hasText = value.trim().length > 0;

  return (
    <View style={s.bar}>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={1000}
        blurOnSubmit={false}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <TouchableOpacity
        style={[s.send, hasText && s.sendActive]}
        onPress={onSend}
        disabled={!hasText}
        activeOpacity={0.8}
      >
        <ArrowUp size={20} color={hasText ? '#000' : colors.textMuted} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.body,
    maxHeight: 120,
    lineHeight: 20,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  sendActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});

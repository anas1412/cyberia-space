import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { btn, btnDanger, btnText, btnDangerText } from '../lib/sharedStyles';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  loadingLabel,
}: Props) {
  const isDanger = variant === 'danger';
  const baseStyle = isDanger ? btnDanger : btn;
  const textStyle = isDanger ? btnDangerText : btnText;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[baseStyle, isDisabled && s.disabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <Text style={textStyle}>
        {loading ? (loadingLabel ?? 'Loading…') : label}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  disabled: { opacity: 0.4 },
});

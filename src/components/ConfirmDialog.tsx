import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import ResponsiveSheet from './ResponsiveSheet';
import Button from './Button';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export default function ConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
}: Props) {
  return (
    <ResponsiveSheet visible={visible} onClose={onClose}>
      <View style={s.body}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.message}>{message}</Text>
        <View style={s.row}>
          <View style={s.cancelWrap}>
            <Button label={cancelLabel} onPress={onClose} variant="primary" />
          </View>
          <View style={s.confirmWrap}>
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={danger ? 'danger' : 'primary'}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </ResponsiveSheet>
  );
}

const s = StyleSheet.create({
  body: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.header,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  message: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelWrap: {
    flex: 1,
  },
  confirmWrap: {
    flex: 1,
  },
});

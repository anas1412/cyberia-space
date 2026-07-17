import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';

interface Props {
  title: string;
  onBack?: () => void;
  onTitlePress?: () => void;
  leftContent?: React.ReactNode;
  rightLabel?: string;
  onRightPress?: () => void;
  rightContent?: React.ReactNode;
}

export default function Header({ title, onBack, onTitlePress, leftContent, rightLabel, onRightPress, rightContent }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.side}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        )}
        {leftContent}
      </View>

      {onTitlePress ? (
        <TouchableOpacity onPress={onTitlePress} style={s.titleBtn} activeOpacity={0.7}>
          <Text style={s.titleText} numberOfLines={1}>{title}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[s.titleText, { flex: 1 }]} numberOfLines={1}>{title}</Text>
      )}

      <View style={[s.side, s.sideRight]}>
        {rightContent || (
          rightLabel && onRightPress ? (
            <TouchableOpacity style={s.action} onPress={onRightPress} activeOpacity={0.8}>
              <Text style={s.actionText}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : null
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  side: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    minWidth: 44,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  back: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  titleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  titleText: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  action: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: '#000',
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});

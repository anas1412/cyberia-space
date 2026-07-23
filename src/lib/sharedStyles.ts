import { colors, spacing, radius, fontSize, fontWeight } from './theme';

// ── Shared style primitives used across all components ──

export const card = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.lg,
  padding: spacing.lg,
} as const;

export const input = {
  backgroundColor: colors.elevated,
  borderWidth: 1,
  borderColor: colors.borderStrong,
  borderRadius: radius.md,
  padding: spacing.lg,
  color: colors.text,
  fontSize: fontSize.body,
} as const;

export const inputPill = {
  ...input,
  borderRadius: 24,
  paddingHorizontal: spacing.xl,
  paddingVertical: spacing.md,
} as const;

export const btn = {
  backgroundColor: colors.accent,
  borderRadius: radius.md,
  padding: spacing.lg,
  alignItems: 'center' as const,
} as const;

export const btnDanger = {
  borderWidth: 1.5,
  borderColor: 'rgba(244,75,66,0.2)',
  borderRadius: radius.md,
  padding: spacing.lg,
  alignItems: 'center' as const,
} as const;

export const btnText = {
  color: '#000',
  fontSize: fontSize.title,
  fontWeight: fontWeight.semibold as '600',
};

export const btnDangerText = {
  color: colors.error,
  fontSize: fontSize.body,
  fontWeight: fontWeight.semibold as '600',
};

export const avatar = (size: number) => ({
  width: size,
  height: size,
  borderRadius: size <= 32 ? radius.sm : size <= 48 ? radius.md : radius.xl,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: colors.accent,
});

export const sectionLabel = {
  fontSize: fontSize.caption,
  fontWeight: fontWeight.semibold as '600',
  color: colors.textMuted,
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
};

export const label = {
  fontSize: fontSize.small,
  fontWeight: fontWeight.semibold as '600',
  color: colors.textSecondary,
};

export const error = {
  color: colors.error,
  fontSize: fontSize.small,
  textAlign: 'center' as const,
};

export const listContainer = {
  padding: spacing.lg,
  gap: spacing.sm,
  paddingBottom: spacing.xxxl,
};

export const shadow = (color: string, opacity = 0.3, y = 4, radius = 12) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Math.round(radius / 2),
});

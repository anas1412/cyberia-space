// ── Stone + Saffron design system ──

export const colors = {
  bg:            '#0E0E0C',
  surface:       '#1A1A17',
  elevated:      '#242421',
  accent:        '#E8A840',
  accentLight:   '#F0C060',
  accentBg:      'rgba(232,168,64,0.12)',
  text:          '#ECECE7',
  textSecondary: '#9C9C94',
  textMuted:     '#5E5E58',
  border:        'rgba(255,255,255,0.06)',
  borderStrong:  'rgba(255,255,255,0.10)',
  online:        '#4EC97C',
  error:         '#F44B42',
} as const;

export const avatarColors = [
  '#E8A840', '#E06050', '#5090D0', '#50B080',
  '#C060D0', '#D08040', '#40A0B0', '#90A030',
] as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
} as const;

export const fontSize = {
  caption: 11,
  small:   13,
  body:    15,
  title:   17,
  header:  20,
  hero:    28,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
};

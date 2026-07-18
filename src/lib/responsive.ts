import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = { sm: 0, md: 768, lg: 1024 } as const;

export type Breakpoint = 'sm' | 'md' | 'lg';

interface ResponsiveTokens {
  bp: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  contentMaxWidth: number;
  chatMaxWidth: number;
  sheetMaxWidth: number;
  cardMaxWidth: number;
  authMaxWidth: number;
  avatar: number;
  chatAvatar: number;
  listAvatar: number;
  bodyFontSize: number;
  titleFontSize: number;
  chatFontSize: number;
  screenPadding: number;
  cardPadding: number;
  bubbleMaxWidth: string;
  inputFontSize: number;
}

export function useResponsive(): ResponsiveTokens {
  const { width, height } = useWindowDimensions();
  const bp: Breakpoint = width >= BREAKPOINTS.lg ? 'lg' : width >= BREAKPOINTS.md ? 'md' : 'sm';

  return {
    bp,
    isMobile: bp === 'sm',
    isTablet: bp === 'md',
    isDesktop: bp === 'lg',
    width,
    height,

    contentMaxWidth: bp === 'lg' ? 720 : bp === 'md' ? 600 : width,
    chatMaxWidth:    bp === 'lg' ? 800 : bp === 'md' ? 640 : width,
    sheetMaxWidth:   bp === 'lg' ? 480 : width,
    cardMaxWidth:    bp === 'lg' ? 480 : width,
    authMaxWidth:    bp === 'lg' ? 420 : width,

    avatar:      bp === 'lg' ? 32 : bp === 'md' ? 28 : 26,
    chatAvatar:  bp === 'lg' ? 36 : 28,
    listAvatar:  bp === 'lg' ? 52 : 48,

    bodyFontSize:  bp === 'lg' ? 16 : 15,
    titleFontSize: bp === 'lg' ? 18 : 17,
    chatFontSize:  bp === 'lg' ? 16 : 15,

    screenPadding: bp === 'lg' ? 24 : 16,
    cardPadding:   bp === 'lg' ? 20 : 16,

    bubbleMaxWidth: bp === 'lg' ? '55%' : '70%',

    inputFontSize: bp === 'lg' ? 16 : 15,
  };
}

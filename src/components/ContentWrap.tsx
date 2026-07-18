import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../lib/responsive';

interface Props {
  variant?: 'content' | 'chat' | 'auth' | 'card';
  children: React.ReactNode;
  style?: any;
}

export default function ContentWrap({ variant = 'content', children, style }: Props) {
  const r = useResponsive();

  const maxWidth =
    variant === 'chat'  ? r.chatMaxWidth :
    variant === 'auth'  ? r.authMaxWidth :
    variant === 'card'  ? r.cardMaxWidth :
                           r.contentMaxWidth;

  return (
    <View style={[s.wrap, { maxWidth, paddingHorizontal: r.screenPadding }, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: '100%',
    flex: 1,
  },
});

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

export default function Loading() {
  return (
    <View style={s.wrap}>
      <ActivityIndicator size="small" color={colors.accent} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});

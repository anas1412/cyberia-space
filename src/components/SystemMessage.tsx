import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '../lib/theme';

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  text: string;
  time: number;
}

export default function SystemMessage({ text, time }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.line} />
      <Text style={s.text}>{text} · {fmtTime(time)}</Text>
      <View style={s.line} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  text: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
    textAlign: 'center',
  },
});

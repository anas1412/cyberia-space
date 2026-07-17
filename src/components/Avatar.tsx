import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontWeight, fontSize } from '../lib/theme';
import { avatar as avatarStyle } from '../lib/sharedStyles';

interface Props {
  color: string;
  letter: string;
  size?: number;
}

export default function Avatar({ color, letter, size = 32 }: Props) {
  const base = avatarStyle(size);
  const textSize = size <= 28 ? 11 : size <= 36 ? fontSize.small : size <= 48 ? fontSize.title : fontSize.header;
  const isLarge = size >= 48;

  return (
    <View style={[base, { backgroundColor: color }]}>
      <Text style={[
        { color: isLarge ? '#000' : '#000', fontSize: textSize, fontWeight: fontWeight.bold },
        isLarge && { fontSize: 38 },
      ]}>
        {letter.toUpperCase()}
      </Text>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Image } from 'react-native';
import Avatar from './Avatar';

interface Props {
  seed: string;
  style: 'croodles-neutral' | 'glass';
  size?: number;
  /** Background color behind the avatar */
  bgColor?: string;
}

export default function DiceBearAvatar({ seed, style, size = 32, bgColor }: Props) {
  const [failed, setFailed] = useState(false);
  const url = `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(seed)}`;
  const bg = bgColor || '#1A1A17';
  const letter = seed.charAt(0);
  const r = style === 'glass' ? 12 : size <= 32 ? 8 : size <= 48 ? 12 : 20;

  if (failed) {
    return <Avatar color={bg} letter={letter} size={size} />;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, overflow: 'hidden' }}>
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: r }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

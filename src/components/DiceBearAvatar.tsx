import React, { useState } from 'react';
import { Image } from 'react-native';
import Avatar from './Avatar';

interface Props {
  seed: string;
  style: 'croodles-neutral' | 'glass';
  size?: number;
  /** Accent color for fallback avatar */
  color?: string;
}

export default function DiceBearAvatar({ seed, style, size = 32, color = '#888' }: Props) {
  const [failed, setFailed] = useState(false);
  const bg = color?.replace('#', '') || '1A1A17';
  const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;
  const letter = seed.charAt(0);

  if (failed) {
    return <Avatar color={color} letter={letter} size={size} />;
  }

  return (
    <Image
      source={{ uri: url }}
      style={{
        width: size,
        height: size,
        borderRadius: style === 'glass' ? 12 : size <= 32 ? 8 : size <= 48 ? 12 : 20,
      }}
      onError={() => setFailed(true)}
    />
  );
}

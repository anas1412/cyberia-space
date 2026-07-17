import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import DiceBearAvatar from './DiceBearAvatar';

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  msg: any;
  isSelf: boolean;
  isConsec?: boolean;
  showAvatar?: boolean;
  showHandle?: boolean;
  showTime?: boolean;
  formatTime?: (ts: number) => string;
}

export default function MessageBubble({
  msg,
  isSelf,
  isConsec = false,
  showAvatar = true,
  showHandle = true,
  showTime = true,
  formatTime: fmt = fmtTime,
}: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const parts = (msg.text as string).split(/(@\w+)/g);
  const avSize = 28;
  const showAv = !isSelf && showAvatar;

  return (
    <Animated.View style={[
      s.wrap,
      isConsec && s.wrapConsec,
      { opacity: fade, transform: [{ translateY: slide }] },
    ]}>
      {/* Avatar + bubble row — aligned to bottom */}
      <View style={[s.row, isSelf && s.rowSelf]}>
        {!isSelf && (
          showAv
            ? <DiceBearAvatar seed={msg.handle} style="croodles-neutral" size={avSize} color={msg.avatarColor} />
            : <View style={{ width: avSize }} />
        )}

        <View style={[s.bubbleCol, isSelf && s.bubbleColSelf]}>
          {!isSelf && showHandle && showAv && (
            <Text style={[s.handle, { color: msg.avatarColor }]}>@{msg.handle}</Text>
          )}
          <View style={[s.bubble, isSelf ? s.bubbleSelf : s.bubbleOther, showAv && (isSelf ? s.bubbleSelfSharp : s.bubbleOtherSharp)]}>
            <Text style={s.text}>
              {parts.map((p: string, i: number) =>
                /^@\w+$/.test(p)
                  ? <Text key={i} style={s.mention}>{p}</Text>
                  : p
              )}
            </Text>
          </View>
        </View>

        {isSelf && (
          showAv
            ? <DiceBearAvatar seed={msg.handle} style="croodles-neutral" size={avSize} color={msg.avatarColor} />
            : <View style={{ width: avSize }} />
        )}
      </View>

      {/* Time below the bubble, only on the last message in a burst */}
      {showTime && (
        <Text style={[s.time, isSelf ? s.timeSelf : s.timeOther]}>{fmt(msg.timestamp)}</Text>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginBottom: 6,
  },
  wrapConsec: {
    marginBottom: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  rowSelf: {
    flexDirection: 'row-reverse',
  },
  bubbleCol: {
    maxWidth: '70%',
  },
  bubbleColSelf: {
    alignItems: 'flex-end',
  },
  handle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    marginBottom: 3,
    paddingHorizontal: 2,
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  bubbleOtherSharp: {
    borderBottomLeftRadius: radius.sm,
  },
  bubbleSelf: {
    backgroundColor: colors.accentBg,
    borderColor: 'rgba(232,168,64,0.2)',
  },
  bubbleSelfSharp: {
    borderBottomRightRadius: radius.sm,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: 21,
  },
  mention: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },
  timeOther: {
    marginLeft: 28 + spacing.sm, // avatar width + gap
  },
  timeSelf: {
    marginRight: 28 + spacing.sm,
    textAlign: 'right',
  },
});

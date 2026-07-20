import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { useResponsive } from '../lib/responsive';
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
  const { chatAvatar, bubbleMaxWidth } = useResponsive();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const parts = (msg.text as string).split(/(@\w+)/g);
  const avSize = chatAvatar;
  const showAv = !isSelf && showAvatar;

  return (
    <Animated.View style={[
      s.wrap,
      isConsec && s.wrapConsec,
      { opacity: fade, transform: [{ translateY: slide }] },
    ]}>
      <View style={[s.row, isSelf && s.rowSelf]}>
        {!isSelf && (
          showAv
            ? <DiceBearAvatar seed={msg.handle ?? msg.userId} style="croodles-neutral" size={avSize} bgColor={msg.avatarColor} />
            : <View style={{ width: avSize }} />
        )}

        <View style={[s.bubbleCol, { maxWidth: bubbleMaxWidth as any }, isSelf && s.bubbleColSelf]}>
          {!isSelf && showHandle && (
            <Text style={[s.handle, { color: msg.avatarColor ?? colors.textMuted }]}>@{msg.handle ?? '…'}</Text>
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
            ? <DiceBearAvatar seed={msg.handle ?? msg.userId} style="croodles-neutral" size={avSize} bgColor={msg.avatarColor} />
            : <View style={{ width: avSize }} />
        )}
      </View>

      {showTime && (
        <Text style={[s.time, isSelf && s.timeSelf, !isSelf && { marginLeft: avSize + spacing.sm }]}>
          {fmt(msg.timestamp)}
        </Text>
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
    alignItems: 'flex-start',
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
    paddingVertical: spacing.sm,
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
    paddingHorizontal: 2,
  },
  timeSelf: {
    textAlign: 'right',
  },
});

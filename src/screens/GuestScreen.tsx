import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { inputPill } from '../lib/sharedStyles';
import Header from '../components/Header';
import DiceBearAvatar from '../components/DiceBearAvatar';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import Loading from '../components/Loading';

export default function GuestScreen({ route, navigation }: any) {
  const { token } = route.params;
  const [guest, setGuest] = useState<any>(null);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const [joined, setJoined] = useState(false);

  const consumeLink = useMutation(api.rooms.consumeGuestLink);
  const leaveGuest = useMutation(api.rooms.leaveGuest);
  const sendMsg = useMutation(api.messages.sendAsGuest);

  const messages = useQuery(api.messages.subscribe, guest?.roomId ? { roomId: guest.roomId } : 'skip') ?? [];
  const room = useQuery(api.rooms.get, guest?.roomId ? { roomId: guest.roomId } : 'skip');

  useEffect(() => {
    consumeLink({ token }).then((res: any) => {
      if (res.error) { setError(res.error); return; }
      setGuest(res);
    });
  }, [token]);

  useEffect(() => {
    if (guest && messages && !joined) {
      setJoined(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [guest, messages]);

  // Filter to live messages only
  const filtered = guest
    ? messages.filter((m: any) => m.timestamp >= guest.joinedAt)
    : [];

  async function handleSend() {
    if (!input.trim() || !guest) return;
    const text = input.trim(); setInput('');
    await sendMsg({
      roomId: guest.roomId,
      handle: guest.handle,
      avatarColor: guest.avatarColor,
      text,
    });
  }

  // Loading
  if (!guest && !error) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <Header title="Joining…" onBack={() => navigation.replace('Auth')} />
        <Loading />
      </SafeAreaView>
    );
  }

  // Error
  if (error) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <Header title="Invalid link" onBack={() => navigation.replace('Auth')} />
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.authBtn} onPress={() => navigation.replace('Auth')}>
            <Text style={s.authBtnText}>Go to login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header
        title={guest.roomName ?? 'Room'}
        onBack={() => navigation.replace('Auth')}
        rightLabel="Leave"
        onRightPress={async () => {
          await leaveGuest({ token });
          navigation.replace('Auth');
        }}
        rightContent={
          <DiceBearAvatar seed={guest.handle} style="croodles-neutral" size={36} bgColor={guest.avatarColor} />
        }
      />

      {/* Guest banner */}
      <View style={s.banner}>
        <Text style={s.bannerText}>
          Visiting as <Text style={s.bannerHandle}>@{guest.handle}</Text> · Sign up to create your own room
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }: any) => (
            <MessageBubble msg={item} isSelf={false} isConsec={false} showHandle showAvatar showTime />
          )}
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyText}>No messages yet</Text>
              <Text style={s.emptySub}>Be the first to say something</Text>
            </View>
          }
        />

        <View style={s.ttlBar}>
          <Text style={s.ttlText}>Messages vanish after 24 hours</Text>
        </View>

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          placeholder="Message…"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: 2, paddingBottom: spacing.sm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  errorText: { color: colors.error, fontSize: fontSize.body, textAlign: 'center' },
  authBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  authBtnText: { color: '#000', fontSize: fontSize.title, fontWeight: fontWeight.semibold },
  banner: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentBg, borderBottomWidth: 1, borderBottomColor: 'rgba(232,168,64,0.15)',
  },
  bannerText: { fontSize: fontSize.caption, color: colors.textSecondary, textAlign: 'center' },
  bannerHandle: { color: colors.accent, fontWeight: fontWeight.semibold },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.body },
  emptySub: { color: colors.textMuted, fontSize: fontSize.small },
  ttlBar: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' as const },
  ttlText: { fontSize: fontSize.caption, color: colors.textMuted },
});

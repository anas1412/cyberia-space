import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import Header from '../components/Header';
import DiceBearAvatar from '../components/DiceBearAvatar';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import Loading from '../components/Loading';
import ContentWrap from '../components/ContentWrap';

export default function GuestScreen({ route, navigation }: any) {
  const { token } = route.params;
  const { userId } = useAuth();
  const [guest, setGuest] = useState<any>(null);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const [joined, setJoined] = useState(false);

  const consumeLink = useMutation(api.rooms.consumeGuestLink);
  const leaveGuest = useMutation(api.rooms.leaveGuest);
  const sendGuestMsg = useMutation(api.messages.sendAsGuest);
  const joinRoom = useMutation(api.rooms.join);
  const sendMsg = useMutation(api.messages.send);
  const ping = useMutation(api.rooms.ping);
  const leaveRoom = useMutation(api.rooms.leave);

  const roomId = guest?.roomId;
  const messages = useQuery(api.messages.subscribe, roomId ? { roomId } : 'skip') ?? [];
  const room = useQuery(api.rooms.get, roomId ? { roomId } : 'skip');

  const isAuth = !!userId;

  useEffect(() => {
    consumeLink({ token }).then((res: any) => {
      if (res.error) { setError(res.error); return; }
      setGuest(res);
    });
  }, [token]);

  // If authenticated, join room as real user
  useEffect(() => {
    if (!isAuth || !userId || !guest?.roomId) return;
    joinRoom({ userId: userId as any, roomId: guest.roomId });
    const interval = setInterval(() => ping({ userId: userId as any, roomId: guest.roomId }), 30000);
    return () => { clearInterval(interval); leaveRoom({ userId: userId as any, roomId: guest.roomId }); };
  }, [isAuth, userId, guest?.roomId]);

  useEffect(() => {
    if (guest && messages && !joined) {
      setJoined(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [guest, messages]);

  // Fetch real user info if authenticated
  const me = useQuery(api.users.get, isAuth && userId ? { userId: userId as any } : 'skip');

  const myHandle = me?.handle ?? 'you';
  const myColor = me?.avatarColor ?? colors.accent;

  // Filter to live messages only
  const filtered = guest
    ? messages.filter((m: any) => m.timestamp >= guest.joinedAt)
    : [];

  async function handleSend() {
    if (!input.trim() || !guest) return;
    const text = input.trim(); setInput('');

    if (isAuth && userId) {
      await sendMsg({ roomId: guest.roomId, userId: userId as any, text });
    } else {
      await sendGuestMsg({ roomId: guest.roomId, handle: guest.handle, avatarColor: guest.avatarColor, text });
    }
  }

  function goBack() {
    if (isAuth) {
      navigation.navigate('Main' as never);
    } else {
      navigation.replace('Auth');
    }
  }

  // Loading
  if (!guest && !error) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Joining…" onBack={goBack} />
          <Loading />
        </ContentWrap>
      </SafeAreaView>
    );
  }

  // Error
  if (error) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Invalid link" onBack={goBack} />
          <View style={s.centered}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.authBtn} onPress={goBack}>
              <Text style={s.authBtnText}>{isAuth ? 'Go to rooms' : 'Go to login'}</Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap variant="chat">
      <Header
        title={room?.name ?? guest.roomName ?? 'Room'}
        onBack={goBack}
        rightLabel="Leave"
        onRightPress={async () => {
          if (isAuth && userId) {
            await leaveRoom({ userId: userId as any, roomId: guest.roomId });
          } else {
            await leaveGuest({ token });
          }
          goBack();
        }}
        rightContent={
          <DiceBearAvatar
            seed={isAuth ? myHandle : guest.handle}
            style="croodles-neutral"
            size={36}
            bgColor={isAuth ? myColor : guest.avatarColor}
          />
        }
      />

      {/* Guest banner — only for unauthenticated users */}
      {!isAuth && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Visiting as <Text style={s.bannerHandle}>@{guest.handle}</Text> · Sign up to create your own room
          </Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }: any) => (
            <MessageBubble
              msg={item}
              isSelf={isAuth ? item.userId === userId : false}
              isConsec={false}
              showHandle
              showAvatar
              showTime
            />
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
          placeholder={isAuth ? `Message #${room?.name ?? '...'}` : 'Message…'}
        />
      </KeyboardAvoidingView>
      </ContentWrap>
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

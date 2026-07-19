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
import SystemMessage from '../components/SystemMessage';
import ChatInput from '../components/ChatInput';
import Loading from '../components/Loading';
import ContentWrap from '../components/ContentWrap';
import Input from '../components/Input';
import useRoomChat from '../hooks/useRoomChat';

export default function InviteScreen({ route, navigation }: any) {
  const { roomId, password: urlPassword } = route.params;
  const { userId, isGuest, isLoading, loginAsGuest } = useAuth();

  const [input, setInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [joinTime] = useState(() => Date.now());
  const listRef = useRef<FlatList>(null);

  const room = useQuery(api.rooms.get, { roomId });
  const joinRoom = useMutation(api.rooms.join);
  const joinAsTemporaryUser = useMutation(api.rooms.joinAsTemporaryUser);
  const leaveRoom = useMutation(api.rooms.leave);
  const ping = useMutation(api.rooms.ping);
  const sendMsg = useMutation(api.messages.send);

  const { items, presence } = useRoomChat({
    roomId,
    userId,
    hasJoined,
    onJoined: () => setHasJoined(true),
    joinTime,
  });

  useEffect(() => {
    if (items.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [items.length]);

  // Handle invite link
  useEffect(() => {
    if (isLoading) return;

    // Already authenticated
    if (userId) {
      if (hasJoined) return;
      setJoinError(null);
      joinRoom({ userId: userId as any, roomId, password: urlPassword ?? undefined }).then((res: any) => {
        if (res?.error) {
          if (res.error === 'Password required') setNeedPassword(true);
          else setJoinError(res.error);
        } else {
          setHasJoined(true);
          setNeedPassword(false);
        }
      });
      const interval = setInterval(() => ping({ userId: userId as any, roomId }), 30000);
      return () => { clearInterval(interval); leaveRoom({ userId: userId as any, roomId }); };
    }

    // Not authenticated — create temporary user account
    if (creatingGuest) return;
    setCreatingGuest(true);
    joinAsTemporaryUser({ roomId, password: urlPassword ?? undefined }).then(async (res: any) => {
      if (res?.error) {
        if (res.error === 'Password required') setNeedPassword(true);
        else setJoinError(res.error);
        setCreatingGuest(false);
        return;
      }
      // Join room first so presence is set before login triggers re-render
      await joinRoom({ userId: res.userId as any, roomId, password: urlPassword ?? undefined });
      await loginAsGuest(res.token, res.userId);
      setCreatingGuest(false);
    });
  }, [userId, roomId, isLoading]);

  async function handleSubmitPassword() {
    if (!passwordInput.trim()) return;
    setJoinError(null);
    setNeedPassword(false);

    if (userId) {
      joinRoom({ userId: userId as any, roomId, password: passwordInput.trim() }).then((res: any) => {
        if (res?.error) {
          if (res.error === 'Password required' || res.error === 'Wrong password') {
            setNeedPassword(true);
            setJoinError(res.error);
          } else {
            setJoinError(res.error);
          }
        } else {
          setHasJoined(true);
        }
      });
    } else {
      joinAsTemporaryUser({ roomId, password: passwordInput.trim() }).then(async (res: any) => {
        if (res?.error) {
          if (res.error === 'Password required' || res.error === 'Wrong password') {
            setNeedPassword(true);
            setJoinError(res.error);
          } else {
            setJoinError(res.error);
          }
        } else {
          await loginAsGuest(res.token, res.userId);
        }
      });
    }
  }

  async function handleSend() {
    if (!input.trim() || !userId) return;
    const text = input.trim(); setInput('');
    await sendMsg({ roomId, userId: userId as any, text });
  }

  function goBack() {
    navigation.navigate('Main' as never);
  }

  const me = useQuery(api.users.get, userId ? { userId: userId as any } : 'skip');
  const name = me?.handle;
  const color = me?.avatarColor;

  if (room === undefined || isLoading || creatingGuest) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Joining…" onBack={goBack} />
          <Loading />
        </ContentWrap>
      </SafeAreaView>
    );
  }

  if (room === null) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Room not found" onBack={goBack} />
          <View style={s.centered}>
            <Text style={s.emptyText}>This room doesn't exist anymore</Text>
            <TouchableOpacity style={s.authBtn} onPress={goBack}>
              <Text style={s.authBtnText}>Go to rooms</Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
    );
  }

  if (needPassword) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title={room?.name ?? 'Join room'} onBack={goBack} />
          <View style={s.centered}>
            <Text style={s.emptyText}>This room requires a password</Text>
            {joinError && <Text style={s.errorText}>{joinError}</Text>}
            <Input
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Enter password"
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[s.authBtn, !passwordInput.trim() && { opacity: 0.4 }]}
              disabled={!passwordInput.trim()}
              onPress={handleSubmitPassword}
            >
              <Text style={s.authBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
    );
  }

  if (joinError) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Cannot join" onBack={goBack} />
          <View style={s.centered}>
            <Text style={s.errorText}>{joinError}</Text>
            <TouchableOpacity style={s.authBtn} onPress={goBack}>
              <Text style={s.authBtnText}>Go to rooms</Text>
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
        title={room?.name ?? 'Room'}
        onBack={isGuest ? undefined : goBack}
        leftContent={isGuest ? (
          <TouchableOpacity onPress={goBack} style={s.loginBtn}>
            <Text style={s.loginBtnText}>Login</Text>
          </TouchableOpacity>
        ) : undefined}
        rightContent={
          name && !isGuest ? <DiceBearAvatar seed={name} style="croodles-neutral" size={36} bgColor={color} /> : undefined
        }
      />

      {isGuest && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Guest session
          </Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }: any) => {
            if (item._kind === 'event') {
              const label = item.isYou ? 'You joined' : item.type === 'join' ? `${item.handle} joined` : `${item.handle} left`;
              return <SystemMessage text={label} time={item.timestamp} />;
            }
            return (
              <MessageBubble
                msg={item}
                isSelf={item.userId === userId}
                isConsec={false}
                showHandle
                showAvatar
                showTime
              />
            );
          }}
          ListEmptyComponent={null}
        />

        <View style={s.ttlBar}>
          <Text style={s.ttlText}>Messages vanish after 24 hours</Text>
        </View>

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          placeholder={`Message #${room?.name ?? '...'}`}
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
  loginBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  loginBtnText: { color: '#000', fontSize: fontSize.small, fontWeight: fontWeight.semibold },
  banner: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentBg, borderBottomWidth: 1, borderBottomColor: 'rgba(232,168,64,0.15)',
  },
  bannerText: { fontSize: fontSize.caption, color: colors.textSecondary, textAlign: 'center' },
  bannerHandle: { color: colors.accent, fontWeight: fontWeight.semibold },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.body },
  ttlBar: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' as const },
  ttlText: { fontSize: fontSize.caption, color: colors.textMuted },
});

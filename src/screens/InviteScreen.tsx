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
import Input from '../components/Input';

export default function InviteScreen({ route, navigation }: any) {
  const { roomId, password: urlPassword } = route.params;
  const { userId } = useAuth();

  const [input, setInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [guest, setGuest] = useState<any>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const listRef = useRef<FlatList>(null);

  const room = useQuery(api.rooms.get, { roomId });
  const messages = useQuery(api.messages.subscribe, { roomId }) ?? [];
  const joinRoom = useMutation(api.rooms.join);
  const joinAsGuest = useMutation(api.rooms.joinAsGuest);
  const leaveRoom = useMutation(api.rooms.leave);
  const leaveGuest = useMutation(api.rooms.leaveGuest);
  const ping = useMutation(api.rooms.ping);
  const sendMsg = useMutation(api.messages.send);
  const sendGuestMsg = useMutation(api.messages.sendAsGuest);

  const me = useQuery(api.users.get, userId ? { userId: userId as any } : 'skip');
  const isAuth = !!userId;

  // Join room
  useEffect(() => {
    // Still loading auth state
    if (userId === undefined) return;

    // Authenticated user
    if (userId) {
      // Clean up any guest session that was created during the loading phase
      if (guest) {
        leaveGuest({ token: guest.token });
        setGuest(null);
      }
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
      return;
    }

    // userId is null — definitely not authenticated, join as guest (only once)
    if (guest || joinError) return;
    joinAsGuest({ roomId, password: urlPassword ?? undefined }).then((res: any) => {
      if (res?.error) {
        if (res.error === 'Password required') setNeedPassword(true);
        else setJoinError(res.error);
      } else {
        setGuest(res);
        setNeedPassword(false);
      }
    });
  }, [userId, roomId, urlPassword]);

  // Ping + cleanup for auth users
  useEffect(() => {
    if (!isAuth || !userId || !hasJoined) return;
    const interval = setInterval(() => ping({ userId: userId as any, roomId }), 30000);
    return () => { clearInterval(interval); leaveRoom({ userId: userId as any, roomId }); };
  }, [isAuth, userId, hasJoined]);

  // Cleanup for guests on unmount
  useEffect(() => {
    return () => { if (guest?.token) leaveGuest({ token: guest.token }); };
  }, [guest?.token]);

  const filtered = guest
    ? messages.filter((m: any) => m.timestamp >= guest.joinedAt)
    : messages;

  useEffect(() => {
    if (filtered.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [filtered.length]);

  async function handleSubmitPassword() {
    if (!passwordInput.trim()) return;
    setJoinError(null);
    setNeedPassword(false);

    if (isAuth && userId) {
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
      joinAsGuest({ roomId, password: passwordInput.trim() }).then((res: any) => {
        if (res?.error) {
          if (res.error === 'Password required' || res.error === 'Wrong password') {
            setNeedPassword(true);
            setJoinError(res.error);
          } else {
            setJoinError(res.error);
          }
        } else {
          setGuest(res);
        }
      });
    }
  }

  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim(); setInput('');

    if (isAuth && userId) {
      await sendMsg({ roomId, userId: userId as any, text });
    } else if (guest) {
      await sendGuestMsg({ roomId, handle: guest.handle, avatarColor: guest.avatarColor, text });
    }
  }

  function goBack() {
    navigation.navigate('Main' as never);
  }

  const isGuest = !isAuth && !!guest;
  const name = me?.handle ?? guest?.handle;
  const color = me?.avatarColor ?? guest?.avatarColor;
  if (room === undefined || userId === undefined) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Joining…" onBack={goBack} />
          <Loading />
        </ContentWrap>
      </SafeAreaView>
    );
  }

  // Room not found
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

  // Need password
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

  // Error
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
        onBack={goBack}
        rightLabel="Leave"
        onRightPress={async () => {
          if (isAuth && userId) {
            await leaveRoom({ userId: userId as any, roomId });
          } else if (guest) {
            await leaveGuest({ token: guest.token });
          }
          goBack();
        }}
        rightContent={
          name ? <DiceBearAvatar seed={name} style="croodles-neutral" size={36} bgColor={color} /> : undefined
        }
      />

      {isGuest && (
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

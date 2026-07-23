import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ban } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import Header from '../components/Header';
import ContentWrap from '../components/ContentWrap';
import DiceBearAvatar from '../components/DiceBearAvatar';
import MessageBubble from '../components/MessageBubble';
import SystemMessage from '../components/SystemMessage';
import ChatInput from '../components/ChatInput';
import RoomSettingsSheet from '../components/RoomSettingsSheet';
import MembersSheet from '../components/MembersSheet';
import Loading from '../components/Loading';
import Input from '../components/Input';
import useRoomChat from '../hooks/useRoomChat';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import type { Id } from '../../convex/_generated/dataModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;

export default function RoomScreen({ route, navigation }: Props) {
  const { roomId: roomIdRaw, password } = route.params;
  const roomId = roomIdRaw as Id<"rooms">;
  const { userId, isGuest, isLoading, isLoggedIn } = useAuth();
  const [input, setInput] = useState('');
  const [joinTime] = useState(() => Date.now());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [retryPassword, setRetryPassword] = useState('');
  const [isNearBottom, setIsNearBottom] = useState(true);
  const listRef = useRef<FlatList>(null);

  const room = useQuery(api.rooms.get, { roomId });
  const me = useQuery(api.users.get, userId ? { userId } : 'skip');
  const sendMsg = useMutation(api.messages.send);
  const joinRoom = useMutation(api.rooms.join);
  const leaveRoom = useMutation(api.rooms.leave);
  const ping = useMutation(api.rooms.ping);

  const { items, presence } = useRoomChat({
    roomId,
    userId,
    hasJoined,
    onJoined: () => setHasJoined(true),
    joinTime,
  });

  // Join room (all users, always)
  useEffect(() => {
    if (!userId) return;
    setJoinError(null);
    joinRoom({ userId, roomId, password: password ?? undefined }).catch((e: any) => {
      setJoinError(e.data?.message ?? e.message);
    });
    const interval = setInterval(() => ping({ userId, roomId }), 30000);

    const handleBeforeUnload = () => {
      leaveRoom({ userId, roomId });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      leaveRoom({ userId, roomId });
    };
  }, [userId, roomId, joinRoom, leaveRoom, ping]);

  // Group consecutive messages
  const msgIndices = new Map<string, { showHandle: boolean; showAvatar: boolean; showTime: boolean; isConsec: boolean }>();
  const msgsOnly = items.filter((i: any) => i._kind === 'msg');
  msgsOnly.forEach((msg: any, i: number) => {
    const prev = msgsOnly[i - 1] as any;
    const next = msgsOnly[i + 1] as any;
    const sameAsPrev = prev && prev.userId === msg.userId && msg.timestamp - prev.timestamp < 60000;
    const sameAsNext = next && next.userId === msg.userId && next.timestamp - msg.timestamp < 60000;
    msgIndices.set(msg._id, {
      showHandle: !sameAsPrev,
      showAvatar: !sameAsNext,
      showTime: !sameAsNext,
      isConsec: sameAsPrev,
    });
  });

  // Navigate away if room was deleted
  useEffect(() => {
    if (room === null) {
      if (isGuest) {
        navigation.replace('Kicked', { roomName: room?.name ?? 'Room', isGuest: true, reason: 'room-deleted' });
      } else if (isLoggedIn) {
        navigation.goBack();
      }
      // else: guest was kicked AND room was deleted — me safety net handles it
    }
  }, [room, isGuest, isLoggedIn]);

  // Detect kick: user account deleted (guest only — regular users keep their accounts)
  useEffect(() => {
    if (userId && me === null) {
      navigation.replace('Kicked', { roomName: room?.name ?? 'Room', isGuest: true, reason: 'kicked' });
    }
  }, [me]);

  // Auto-scroll to bottom when new items arrive, but only if near bottom
  useEffect(() => {
    if (isNearBottom && items.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 150);
    }
  }, [items, isNearBottom]);

  // Loading state
  if (room === undefined) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="..." onBack={() => navigation.navigate('Main')} />
          <Loading />
        </ContentWrap>
      </SafeAreaView>
    );
  }

  // Password error — show retry input
  if (joinError && !hasJoined) {
    const isPasswordError = joinError === 'Password required' || joinError === 'Wrong password';
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title={room?.name ?? 'Join room'} onBack={() => navigation.navigate('Main')} />
          <View style={s.bannedWrap}>
            <Ban size={48} color={joinError === 'You are banned from this room' ? colors.error : colors.textSecondary} strokeWidth={1.5} />
            <Text style={s.bannedTitle}>
              {joinError === 'You are banned from this room' ? 'You are banned' : isPasswordError ? 'Password required' : 'Cannot join'}
            </Text>
            <Text style={s.bannedSub}>{joinError}</Text>
            {isPasswordError && (
              <View style={s.retryRow}>
                <Input
                  value={retryPassword}
                  onChangeText={setRetryPassword}
                  placeholder="Enter password"
                  autoCapitalize="characters"
                  maxLength={6}
                  style={s.retryInput}
                />
                <TouchableOpacity
                  style={[s.retryBtn, !retryPassword.trim() && { opacity: 0.4 }]}
                  disabled={!retryPassword.trim()}
                  onPress={() => {
                    setJoinError(null);
                    joinRoom({ userId, roomId, password: retryPassword.trim() }).catch((e: any) => {
                      setJoinError(e.data?.message ?? e.message);
                    });
                    setRetryPassword('');
                  }}
                >
                  <Text style={s.retryBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={s.bannedBtn} onPress={() => navigation.navigate('Main')} activeOpacity={0.8}>
              <Text style={s.bannedBtnText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
    );
  }

  const isOwner = room && userId && room.ownerId === userId;

  async function handleSend() {
    if (!input.trim() || !userId) return;
    const text = input.trim(); setInput('');
    await sendMsg({ roomId, userId, text });
  }

  const allOnline = [...(presence as any[])];
  const presElements = (
    <TouchableOpacity onPress={() => setMembersVisible(true)} style={s.presRow} activeOpacity={0.7}>
      {allOnline.slice(0, 4).map((p: any, i: number) => (
        <View key={p.userId ?? `guest-${i}`} style={[s.presAvWrap, { marginLeft: -8 }]}>
          <DiceBearAvatar seed={p.handle} style="croodles-neutral" size={26} bgColor={p.avatarColor} />
        </View>
      ))}
      {allOnline.length > 4 && <Text style={s.presMore}>+{allOnline.length - 4}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap variant="chat">
        <Header
          title={room?.name ?? '...'}
          onBack={isGuest ? undefined : async () => {
            await leaveRoom({ userId, roomId });
            navigation.navigate('Main');
          }}
          leftContent={isGuest ? (
            <TouchableOpacity onPress={() => navigation.navigate('Auth', { preAuthRoomId: roomId, preAuthRoomName: room?.name, preAuthPassword: password })} style={s.loginBtn} activeOpacity={0.8}>
              <Text style={s.loginBtnText}>Log in</Text>
            </TouchableOpacity>
          ) : undefined}
          onTitlePress={isOwner ? () => setSheetVisible(true) : undefined}
          rightContent={presElements}
        />

        {!isLoading && isGuest && (
          <View style={s.guestBar}>
            <Text style={s.guestBarText}>Guest session</Text>
          </View>
        )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // scrollToEnd here often misses the final item; useEffect on items is more reliable
          }}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
            const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
            if (isAtBottom !== isNearBottom) setIsNearBottom(isAtBottom);
          }}
          scrollEventThrottle={200}
          renderItem={({ item }: any) => {
            if (item._kind === 'event') {
              const label = item.isYou ? 'You joined' : item.type === 'join' ? `${item.handle} joined` : `${item.handle} left`;
              return <SystemMessage text={label} time={item.timestamp} />;
            }
            const g = msgIndices.get(item._id);
            if (!g) return <MessageBubble msg={item} isSelf={item.userId === userId} />;
            return <MessageBubble msg={item} isSelf={item.userId === userId} isConsec={g.isConsec} showHandle={g.showHandle} showAvatar={g.showAvatar} showTime={g.showTime} />;
          }}
        />

        <View style={s.ttlBar}>
          <Text style={s.ttlText}>Messages vanish after 24 hours or if you leave</Text>
        </View>

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          placeholder={`Message #${room?.name ?? '...'}`}
        />
      </KeyboardAvoidingView>

      </ContentWrap>

      {userId && (
        <RoomSettingsSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onDeleted={() => navigation.navigate('Main')}
          roomId={roomId}
          userId={userId}
          roomName={room?.name ?? '...'}
          roomTopic={room?.topic}
          roomType={room?.type}
          createdAt={room?.createdAt}
        />
      )}
      {userId && (
        <MembersSheet
          visible={membersVisible}
          onClose={() => setMembersVisible(false)}
          roomId={roomId}
          userId={userId}
          isOwner={!!isOwner}
          ownerId={room?.ownerId}
          members={presence as any[]}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  presRow: { flexDirection: 'row', alignItems: 'center' },
  presAvWrap: { borderWidth: 2, borderColor: colors.bg, borderRadius: radius.sm },
  presMore: { fontSize: fontSize.caption, color: colors.textMuted, marginLeft: spacing.sm },

  list: { padding: spacing.lg, paddingBottom: spacing.sm, gap: 2 },

  ttlBar: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center',
  },
  ttlText: { fontSize: fontSize.caption, color: colors.textMuted },

  bannedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl },
  bannedTitle: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.text },
  bannedSub: { fontSize: fontSize.body, color: colors.textSecondary, textAlign: 'center' },
  bannedBtn: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border },
  bannedBtnText: { color: colors.text, fontSize: fontSize.body, fontWeight: fontWeight.semibold },

  retryRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', width: '100%' },
  retryInput: { flex: 1 },
  retryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  retryBtnText: { color: '#000', fontSize: fontSize.title, fontWeight: fontWeight.semibold },

  guestBar: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    alignItems: 'center',
  },
  guestBarText: { fontSize: fontSize.small, color: colors.textMuted },

  loginBtn: {
    height: 36, paddingHorizontal: spacing.md,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: { color: '#000', fontSize: fontSize.small, fontWeight: fontWeight.semibold },
});

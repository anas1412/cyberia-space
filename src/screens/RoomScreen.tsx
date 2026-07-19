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
import useRoomChat from '../hooks/useRoomChat';

export default function RoomScreen({ route, navigation }: any) {
  const { roomId, password, fromInvite } = route.params ?? {};
  const { userId, isGuest, loginAsGuest, logout } = useAuth();
  const [input, setInput] = useState('');
  const [joinTime] = useState(() => Date.now());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const listRef = useRef<FlatList>(null);

  const room = useQuery(api.rooms.get, { roomId });
  const sendMsg = useMutation(api.messages.send);
  const joinRoom = useMutation(api.rooms.join);
  const leaveRoom = useMutation(api.rooms.leave);
  const ping = useMutation(api.rooms.ping);
  const joinAsTemporaryUser = useMutation(api.rooms.joinAsTemporaryUser);

  const { items, presence } = useRoomChat({
    roomId,
    userId,
    hasJoined,
    onJoined: () => setHasJoined(true),
    joinTime,
  });

  // Handle invite link: create temporary user account
  useEffect(() => {
    if (!fromInvite || userId || creatingGuest) return;

    setCreatingGuest(true);
    setJoinError(null);
    joinAsTemporaryUser({ roomId, password: password ?? undefined }).then(async (res: any) => {
      if (res?.error) {
        if (res.error === 'Password required') setJoinError(res.error);
        else setJoinError(res.error);
        setCreatingGuest(false);
        return;
      }
      // Login as guest using the created account
      await loginAsGuest(res.token, res.userId);
      setCreatingGuest(false);
    });
  }, [fromInvite, userId]);

  // Join room for authenticated users
  useEffect(() => {
    if (!userId || fromInvite) return;
    setJoinError(null);
    joinRoom({ userId: userId as any, roomId, password: password ?? undefined }).then((res: any) => {
      if (res?.error) setJoinError(res.error);
    });
    const interval = setInterval(() => ping({ userId: userId as any, roomId }), 30000);
    return () => { clearInterval(interval); leaveRoom({ userId: userId as any, roomId }); };
  }, [userId, roomId]);

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
    if (room === null) navigation.goBack();
  }, [room]);

  // Loading state
  if (room === undefined || creatingGuest) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title={fromInvite ? "Joining…" : "..."} onBack={() => navigation.goBack()} />
          <Loading />
        </ContentWrap>
      </SafeAreaView>
    );
  }

  // Error state
  if (joinError) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Cannot join" onBack={() => navigation.goBack()} />
          <View style={s.bannedWrap}>
            <Ban size={48} color={joinError === 'You are banned from this room' ? colors.error : colors.textSecondary} strokeWidth={1.5} />
            <Text style={s.bannedTitle}>{joinError === 'You are banned from this room' ? 'You are banned' : 'Cannot join'}</Text>
            <Text style={s.bannedSub}>{joinError}</Text>
            <TouchableOpacity style={s.bannedBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
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
    await sendMsg({ roomId, userId: userId as any, text });
  }

  async function handleLogin() {
    // Store room info before logging out
    const currentRoomId = roomId;
    const currentRoomName = room?.name;

    // Log out guest
    await logout();

    // Navigate to auth, then back to room
    navigation.navigate('Auth', {
      preAuthRoomId: currentRoomId,
      preAuthRoomName: currentRoomName,
    });
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
          onBack={isGuest ? undefined : () => navigation.goBack()}
          leftContent={isGuest ? (
            <TouchableOpacity onPress={handleLogin} style={s.loginBtn}>
              <Text style={s.loginBtnText}>Login</Text>
            </TouchableOpacity>
          ) : undefined}
          onTitlePress={isOwner ? () => setSheetVisible(true) : undefined}
          rightContent={presElements}
        />

      {isGuest && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Guest session
          </Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
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

      {!isGuest && userId && (
        <RoomSettingsSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onDeleted={() => navigation.goBack()}
          roomId={roomId}
          userId={userId as string}
          roomName={room?.name ?? '...'}
          roomTopic={room?.topic}
          roomType={room?.type}
          createdAt={room?.createdAt}
        />
      )}
      {!isGuest && userId && (
        <MembersSheet
          visible={membersVisible}
          onClose={() => setMembersVisible(false)}
          roomId={roomId}
          userId={userId as string}
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

  banner: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentBg, borderBottomWidth: 1, borderBottomColor: 'rgba(232,168,64,0.15)',
  },
  bannerText: { fontSize: fontSize.caption, color: colors.textSecondary, textAlign: 'center' },
  bannerLink: { color: colors.accent, fontWeight: fontWeight.semibold },

  loginBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  loginBtnText: { color: '#000', fontSize: fontSize.small, fontWeight: fontWeight.semibold },

  bannedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl },
  bannedTitle: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.text },
  bannedSub: { fontSize: fontSize.body, color: colors.textSecondary, textAlign: 'center' },
  bannedBtn: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border },
  bannedBtnText: { color: colors.text, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});

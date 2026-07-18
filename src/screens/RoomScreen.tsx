import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ban } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import Header from '../components/Header';
import DiceBearAvatar from '../components/DiceBearAvatar';
import MessageBubble from '../components/MessageBubble';
import SystemMessage from '../components/SystemMessage';
import ChatInput from '../components/ChatInput';
import RoomSettingsSheet from '../components/RoomSettingsSheet';
import MembersSheet from '../components/MembersSheet';
import Loading from '../components/Loading';

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RoomScreen({ route, navigation }: any) {
  const { roomId, name } = route.params;
  const { userId } = useAuth();
  const [input, setInput] = useState('');
  const [joinTime] = useState(() => Date.now());
  const [events, setEvents] = useState<any[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const prevPresence = useRef<Set<string>>(new Set());
  const hasJoined = useRef(false);
  const [banned, setBanned] = useState(false);
  const handleCache = useRef<Map<string, string>>(new Map());
  const listRef = useRef<FlatList>(null);

  const room = useQuery(api.rooms.get, { roomId });
  const messages = useQuery(api.messages.subscribe, { roomId, since: joinTime }) ?? [];
  const presence = useQuery(api.rooms.getPresence, { roomId }) ?? [];
  const sendMsg = useMutation(api.messages.send);
  const joinRoom = useMutation(api.rooms.join);
  const leaveRoom = useMutation(api.rooms.leave);
  const ping = useMutation(api.rooms.ping);

  useEffect(() => {
    if (!userId) return;
    joinRoom({ userId: userId as any, roomId }).then((res: any) => {
      if (res?.error) setBanned(true);
    });
    const interval = setInterval(() => ping({ userId: userId as any, roomId }), 30000);
    return () => { clearInterval(interval); leaveRoom({ userId: userId as any, roomId }); };
  }, [userId, roomId]);

  // Detect if kicked (no longer in presence)
  useEffect(() => {
    if (hasJoined.current && userId) {
      const inPresence = (presence as any[]).some((p: any) => p.userId === userId);
      if (!inPresence) navigation.goBack();
    }
  }, [presence, userId]);

  // Track presence changes → system events
  useEffect(() => {
    const currentIds = new Set((presence as any[]).map((p: any) => p.userId));

    // Cache handles for leave events
    for (const p of (presence as any[])) {
      handleCache.current.set(p.userId, p.handle);
    }

    // Wait until we detect ourselves in the room before tracking others
    if (!hasJoined.current) {
      if (userId && currentIds.has(userId)) {
        hasJoined.current = true;
        const others = [...currentIds].filter(id => id !== userId);
        setEvents(prev => [
          ...prev,
          { _id: `join-you`, type: 'join', handle: 'You', timestamp: joinTime, isYou: true },
          // Don't emit events for people already here — just seed them silently
        ]);
        // Seed current state as baseline — everyone here now is "already present"
        prevPresence.current = new Set(currentIds);
      }
      return;
    }

    const prev = prevPresence.current;
    const now = Date.now();

    // Others joined (appeared since last check and not in baseline)
    for (const id of currentIds) {
      if (!prev.has(id) && id !== userId) {
        const p = (presence as any[]).find((x: any) => x.userId === id);
        if (p) {
          setEvents(prev => [...prev, { _id: `join-${id}-${now}`, type: 'join', handle: p.handle, timestamp: now }]);
        }
      }
    }

    // Others left
    for (const id of prev) {
      if (!currentIds.has(id) && id !== userId) {
        const cached = handleCache.current.get(id) || 'Someone';
        setEvents(prev => [...prev, { _id: `leave-${id}-${now}`, type: 'leave', handle: cached, timestamp: now }]);
      }
    }

    prevPresence.current = new Set(currentIds);
  }, [presence, userId]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, events.length]);

  // Merge messages and system events sorted by timestamp
  const items = [
    ...messages.map((m: any) => ({ ...m, _kind: 'msg' as const })),
    ...events.map((e: any) => ({ ...e, _kind: 'event' as const })),
  ].sort((a: any, b: any) => a.timestamp - b.timestamp);

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

  if (room === undefined) return <SafeAreaView style={s.container} edges={['top']}><Header title="..." onBack={() => navigation.goBack()} /><Loading /></SafeAreaView>;

  const isOwner = room && userId && room.ownerId === userId;

  async function handleSend() {
    if (!input.trim() || !userId) return;
    const text = input.trim(); setInput('');
    await sendMsg({ roomId, userId: userId as any, text });
  }

  const presElements = (
    <TouchableOpacity onPress={() => setMembersVisible(true)} style={s.presRow} activeOpacity={0.7}>
      {(presence as any[]).slice(0, 4).map((p: any) => (
        <View key={p.userId} style={[s.presAvWrap, { marginLeft: -8 }]}>
          <DiceBearAvatar seed={p.handle} style="croodles-neutral" size={26} bgColor={p.avatarColor} />
        </View>
      ))}
      {presence.length > 4 && <Text style={s.presMore}>+{presence.length - 4}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title={room?.name ?? name} onBack={() => navigation.goBack()} onTitlePress={isOwner ? () => setSheetVisible(true) : undefined} rightContent={presElements} />

      {banned ? (
        <View style={s.bannedWrap}>
          <Ban size={48} color={colors.error} strokeWidth={1.5} />
          <Text style={s.bannedTitle}>You are banned</Text>
          <Text style={s.bannedSub}>You can no longer access this room</Text>
          <TouchableOpacity style={s.bannedBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={s.bannedBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
          <Text style={s.ttlText}>Messages vanish after 24 hours</Text>
        </View>

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          placeholder={`Message #${room?.name ?? '...'}`}
        />
      </KeyboardAvoidingView>
      )}

      <RoomSettingsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        roomId={roomId}
        userId={userId as string}
        roomName={room?.name ?? name}
        roomTopic={room?.topic}
        roomType={room?.type}
        createdAt={room?.createdAt}
      />
      <MembersSheet
        visible={membersVisible}
        onClose={() => setMembersVisible(false)}
        roomId={roomId}
        userId={userId as string}
        isOwner={!!isOwner}
        members={presence as any[]}
      />
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
});

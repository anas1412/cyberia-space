import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize } from '../lib/theme';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import MessageBubble from '../components/MessageBubble';
import SystemMessage from '../components/SystemMessage';
import ChatInput from '../components/ChatInput';

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RoomScreen({ route, navigation }: any) {
  const { roomId, name } = route.params;
  const { userId } = useAuth();
  const [input, setInput] = useState('');
  const [joinTime] = useState(() => Date.now());
  const [events, setEvents] = useState<any[]>([]);
  const prevPresence = useRef<Set<string>>(new Set());
  const hasJoined = useRef(false);
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
    joinRoom({ userId: userId as any, roomId });
    const interval = setInterval(() => ping({ userId: userId as any, roomId }), 30000);
    return () => { clearInterval(interval); leaveRoom({ userId: userId as any, roomId }); };
  }, [userId, roomId]);

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

  async function handleSend() {
    if (!input.trim() || !userId) return;
    const text = input.trim(); setInput('');
    await sendMsg({ roomId, userId: userId as any, text });
  }

  const presElements = (
    <View style={s.presRow}>
      {(presence as any[]).slice(0, 4).map((p: any) => (
        <View key={p.userId} style={[s.presAvWrap, { marginLeft: -8 }]}>
          <Avatar color={p.avatarColor} letter={p.handle.charAt(0)} size={26} />
        </View>
      ))}
      {presence.length > 4 && <Text style={s.presMore}>+{presence.length - 4}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title={room?.name ?? name} onBack={() => navigation.goBack()} rightContent={presElements} />

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
});

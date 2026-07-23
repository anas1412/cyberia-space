import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { inputPill } from '../lib/sharedStyles';
import Header from '../components/Header';
import ContentWrap from '../components/ContentWrap';
import DiceBearAvatar from '../components/DiceBearAvatar';
import MessageBubble from '../components/MessageBubble';
import EmptyState from '../components/EmptyState';
import ChatInput from '../components/ChatInput';
import Loading from '../components/Loading';

export default function DMScreen({ route, navigation }: any) {
  const { conversationId } = route.params;
  const { userId } = useAuth();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const messages = useQuery(api.dms.subscribeMessages, { conversationId });
  const sendMsg = useMutation(api.dms.send);
  const markRead = useMutation(api.dms.markRead);

  const otherFromMsg = messages?.find((m: any) => m.userId !== userId);
  const otherUserId = otherFromMsg?.userId;
  const otherUser = useQuery(api.users.get, otherUserId ? { userId: otherUserId } : 'skip');

  useEffect(() => {
    if (messages && messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  useEffect(() => {
    if (userId && messages) markRead({ conversationId, userId });
  }, [messages, userId]);

  if (messages === undefined) return <SafeAreaView style={s.container} edges={['top']}><ContentWrap variant="chat"><Header title="..." onBack={() => navigation.goBack()} /><Loading /></ContentWrap></SafeAreaView>;

  const displayUser = otherUser;

  async function handleSend() {
    if (!input.trim() || !userId) return;
    const text = input.trim(); setInput('');
    await sendMsg({ conversationId, userId, text });
  }

  const grouped = messages.map((msg: any, i: number) => {
    const prev = messages[i - 1] as any;
    const next = messages[i + 1] as any;
    const sameAsPrev = prev && prev.userId === msg.userId && msg.timestamp - prev.timestamp < 60000;
    const sameAsNext = next && next.userId === msg.userId && next.timestamp - msg.timestamp < 60000;
    return {
      ...msg,
      showHandle: !sameAsPrev,
      showAvatar: !sameAsNext,
      showTime: !sameAsNext,
      isConsec: sameAsPrev,
    };
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap variant="chat">
        <Header
        title={`@${displayUser?.handle ?? '…'}`}
        onBack={() => navigation.goBack()}
        rightContent={
          displayUser ? <DiceBearAvatar seed={displayUser.handle} style="croodles-neutral" size={36} bgColor={displayUser.avatarColor} /> : undefined
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <FlatList
          ref={listRef}
          data={grouped}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }: any) => (
            <MessageBubble msg={item} isSelf={item.userId === userId} isConsec={item.isConsec} showHandle={false} showAvatar={item.showAvatar} showTime={item.showTime} />
          )}
          ListEmptyComponent={
            <EmptyState title="Start the conversation" subtitle="Messages vanish after 24 hours" />
          }
        />

        <View style={s.ttlBar}>
          <Text style={s.ttlText}>Messages vanish after 24 hours</Text>
        </View>

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          placeholder={`Message @${displayUser?.handle ?? '…'}`}
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

  ttlBar: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' as const },
  ttlText: { fontSize: fontSize.caption, color: colors.textMuted },
});

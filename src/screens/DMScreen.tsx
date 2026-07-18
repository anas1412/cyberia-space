import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { inputPill } from '../lib/sharedStyles';
import Header from '../components/Header';
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

  useEffect(() => {
    if (messages && messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  useEffect(() => {
    if (userId && messages) markRead({ conversationId, userId: userId as any });
  }, [messages, userId]);

  if (messages === undefined) return <SafeAreaView style={s.container} edges={['top']}><Header title="..." onBack={() => navigation.goBack()} /><Loading /></SafeAreaView>;

  const other = messages.find((m: any) => m.userId !== userId);

  async function handleSend() {
    if (!input.trim() || !userId) return;
    const text = input.trim(); setInput('');
    await sendMsg({ conversationId, userId: userId as any, text });
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
      <Header
        title={`@${other?.handle ?? '…'}`}
        onBack={() => navigation.goBack()}
        rightContent={
          other ? <DiceBearAvatar seed={other.handle} style="croodles-neutral" size={36} bgColor={other.avatarColor} /> : undefined
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
            <EmptyState title="Start the conversation" subtitle="Messages here are saved permanently" />
          }
        />

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          placeholder={`Message @${other?.handle ?? '…'}`}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: 2, paddingBottom: spacing.sm },
});

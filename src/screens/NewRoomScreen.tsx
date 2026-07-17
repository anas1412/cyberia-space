import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { label as labelStyle } from '../lib/sharedStyles';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';

export default function NewRoomScreen({ navigation }: any) {
  const { userId, user } = useAuth();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createPublic = useMutation(api.rooms.createPublic);
  const createPrivate = useMutation(api.rooms.createPrivate);
  const hasPrivateRoom = !!user?.privateRoomId;

  async function handleCreate() {
    if (!name.trim() || !userId) return;
    setLoading(true); setError('');
    try {
      if (isPrivate) {
        const res = await createPrivate({ userId: userId as any, name: name.trim() });
        if ('error' in res && res.error) { setError(res.error); setLoading(false); return; }
        navigation.replace('Room', { roomId: res.roomId, name: name.trim() });
      } else {
        const roomId = await createPublic({ userId: userId as any, name: name.trim(), topic: topic.trim() || undefined });
        navigation.replace('Room', { roomId, name: name.trim() });
      }
    } catch (e: any) { setError(e.message); setLoading(false); }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="New Room" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.field}>
            <Text style={s.label}>Room name</Text>
            <Input value={name} onChangeText={setName}
              placeholder="e.g. general, design, random" maxLength={40} autoFocus autoCapitalize="none" />
          </View>

          {!isPrivate && (
            <View style={s.field}>
              <Text style={s.label}>Topic <Text style={s.labelOpt}>(optional)</Text></Text>
              <Input value={topic} onChangeText={setTopic}
                placeholder="What's this room about?" maxLength={100} />
            </View>
          )}

          <View style={s.toggleRow}>
            <TouchableOpacity style={[s.seg, !isPrivate && s.segActive]} onPress={() => setIsPrivate(false)} activeOpacity={0.8}>
              <Text style={[s.segText, !isPrivate && s.segTextActive]}>Public</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.seg, isPrivate && s.segActive]}
              onPress={() => !hasPrivateRoom && setIsPrivate(true)} disabled={hasPrivateRoom} activeOpacity={0.8}>
              <Text style={[s.segText, isPrivate && s.segTextActive]}>
                Private{hasPrivateRoom ? ' (taken)' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.desc}>
            {isPrivate
              ? 'Your permanent space — one per account. Stays open when you\'re away.'
              : 'Anyone can discover and join. No history on entry.'}
          </Text>

          <View style={s.info}>
            {[
              { icon: '⚡', text: 'No message history when someone joins' },
              { icon: '🕒', text: 'All messages dissolve after 24 hours' },
              isPrivate
                ? { icon: '🏠', text: 'Your room stays open even when you\'re away' }
                : { icon: '👥', text: 'Anyone can discover and join' },
            ].map((item, i) => (
              <View key={i} style={s.infoRow}>
                <Text style={s.infoIcon}>{item.icon}</Text>
                <Text style={s.infoText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Button
            label={isPrivate ? 'Claim my room' : 'Create room'}
            onPress={handleCreate}
            disabled={!name.trim()}
            loading={loading}
            loadingLabel="Creating…"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  field: { gap: spacing.sm },
  label: labelStyle,
  labelOpt: { color: colors.textMuted, fontWeight: fontWeight.regular },
  toggleRow: {
    flexDirection: 'row', backgroundColor: colors.elevated,
    borderRadius: radius.md, padding: 3, borderWidth: 1, borderColor: colors.borderStrong,
  },
  seg: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.sm - 2 },
  segActive: { backgroundColor: colors.accent },
  segText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.textMuted },
  segTextActive: { color: '#000' },
  desc: { fontSize: fontSize.small, color: colors.textSecondary, lineHeight: 20, textAlign: 'center' },
  info: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  infoIcon: { fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 },
  infoText: { fontSize: fontSize.small, color: colors.textSecondary, flex: 1, lineHeight: 19 },
  error: { color: colors.error, fontSize: fontSize.small, textAlign: 'center' },
});

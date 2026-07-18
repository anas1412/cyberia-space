import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';
import { Zap, Clock, Home, Users } from 'lucide-react-native';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { label as labelStyle } from '../lib/sharedStyles';
import ContentWrap from '../components/ContentWrap';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';

export default function NewRoomScreen({ navigation }: any) {
  const { userId } = useAuth();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [roomType, setRoomType] = useState<'public' | 'invite' | 'hidden'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = useMutation(api.rooms.create);
  const myRoom = useQuery(api.rooms.getMyRoom, userId ? { userId: userId as any } : 'skip');
  const hasRoom = !!myRoom;

  async function handleCreate() {
    if (!name.trim() || !userId) return;
    setLoading(true); setError('');
    try {
      const res = await createRoom({ userId: userId as any, name: name.trim(), type: roomType, topic: topic.trim() || undefined });
      navigation.replace('Room', { roomId: res.roomId, name: res.name ?? name.trim() });
    } catch (e: any) { setError(e.message); setLoading(false); }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap>
        <Header title="New Room" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.field}>
            <Text style={s.label}>Room name</Text>
            <Input value={name} onChangeText={setName}
              placeholder="e.g. general, design, random" maxLength={40} autoFocus autoCapitalize="none" />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Topic <Text style={s.labelOpt}>(optional)</Text></Text>
            <Input value={topic} onChangeText={setTopic}
              placeholder="What's this room about?" maxLength={100} />
          </View>

          <View style={s.toggleRow}>
            {(['public', 'invite', 'hidden'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.seg, roomType === t && s.segActive]}
                onPress={() => !hasRoom && setRoomType(t)}
                disabled={hasRoom}
                activeOpacity={0.8}
              >
                <Text style={[s.segText, roomType === t && s.segTextActive]}>
                  {t === 'public' ? 'Public' : t === 'invite' ? 'Invite' : 'Hidden'}
                  {hasRoom ? ' (taken)' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.desc}>
            {roomType === 'public'
              ? 'Anyone can discover and join.'
              : roomType === 'invite'
                ? 'Listed in directory. Join by invite code or guest link.'
                : 'Unlisted. Only accessible via guest link.'}
          </Text>

          <View style={s.info}>
            {[
              { Icon: Zap, text: 'No message history when someone joins' },
              { Icon: Clock, text: 'All messages dissolve after 24 hours' },
              roomType === 'hidden'
                ? { Icon: Home, text: 'Your room is unlisted, reachable only by link' }
                : { Icon: Users, text: 'Discoverable and joinable via code or link' },
            ].map((item, i) => (
              <View key={i} style={s.infoRow}>
                <item.Icon size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text style={s.infoText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Button
            label={hasRoom ? 'You already have a room' : 'Create room'}
            onPress={handleCreate}
            disabled={!name.trim() || hasRoom}
            loading={loading}
            loadingLabel="Creating…"
          />
        </ScrollView>
      </KeyboardAvoidingView>
      </ContentWrap>
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
  infoIcon: { width: 22, alignItems: 'center', flexShrink: 0 },
  infoText: { fontSize: fontSize.small, color: colors.textSecondary, flex: 1, lineHeight: 19 },
  error: { color: colors.error, fontSize: fontSize.small, textAlign: 'center' },
});

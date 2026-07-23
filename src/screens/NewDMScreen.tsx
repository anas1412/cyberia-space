import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, fontWeight } from '../lib/theme';
import { card, label as labelStyle } from '../lib/sharedStyles';
import ContentWrap from '../components/ContentWrap';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import DiceBearAvatar from '../components/DiceBearAvatar';

export default function NewDMScreen({ navigation }: any) {
  const { userId } = useAuth();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getOrCreate = useMutation(api.dms.getOrCreate);
  const targetUser = useQuery(
    api.users.getByHandle,
    handle.length >= 2 ? { handle: handle.replace('@', '') } : 'skip'
  );

  async function handleStart() {
    if (!userId || !targetUser) return;
    if ((targetUser._id as string) === userId) { setError("You can't message yourself"); return; }
    setLoading(true); setError('');
    try {
      const convId = await getOrCreate({ userId, targetId: targetUser._id });
      navigation.replace('DM', { conversationId: convId });
    } catch (e: any) { setError(e.message); setLoading(false); }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap>
        <Header title="New Message" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.content}>
          <View style={s.field}>
            <Text style={s.label}>Find someone by handle</Text>
            <Input value={handle} onChangeText={t => { setHandle(t); setError(''); }}
              placeholder="@username" autoFocus autoCapitalize="none"
              onSubmitEditing={handleStart} />
          </View>

          {handle.length >= 2 && (
            <View style={card}>
              {targetUser ? (
                <View style={s.userRow}>
                  <DiceBearAvatar seed={targetUser.handle} style="croodles-neutral" size={44} bgColor={targetUser.avatarColor} />
                  <View>
                    <Text style={s.userHandle}>@{targetUser.handle}</Text>
                    <Text style={s.userFound}>User found</Text>
                  </View>
                </View>
              ) : (
                <Text style={s.notFound}>No user found</Text>
              )}
            </View>
          )}

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Button
            label="Start conversation"
            onPress={handleStart}
            disabled={!targetUser}
            loading={loading}
            loadingLabel="Opening…"
          />
        </View>
      </KeyboardAvoidingView>
      </ContentWrap>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.xl, gap: spacing.xl },

  field: { gap: spacing.sm },
  label: labelStyle,

  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  userHandle: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },
  userFound: { fontSize: fontSize.caption, color: colors.online, marginTop: 2 },
  notFound: { color: colors.textSecondary, fontSize: fontSize.body, textAlign: 'center' },

  error: { color: colors.error, fontSize: fontSize.small, textAlign: 'center' },
});

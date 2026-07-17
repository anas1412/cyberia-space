import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight, avatarColors } from '../lib/theme';
import { card as cardStyle } from '../lib/sharedStyles';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import Avatar from '../components/Avatar';

export default function ProfileScreen({ navigation }: any) {
  const { user, userId, logout } = useAuth();
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [color, setColor] = useState(user?.avatarColor ?? avatarColors[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const updateProfile = useMutation(api.users.updateProfile);

  async function handleSave() {
    if (!userId) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await updateProfile({ userId: userId as any, handle, avatarColor: color });
      if (res && 'error' in res && res.error) setError(res.error);
      else setSaved(true);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  function confirmLogout() {
    Alert.alert('Sign out?', 'You can sign back in anytime with your phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); navigation.replace('Auth'); } },
    ]);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="Profile" rightLabel="Save" onRightPress={handleSave} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Avatar color={color} letter={(handle || user?.handle || '?').charAt(0)} size={88} />
          <Text style={s.handleText}>@{handle || user?.handle}</Text>
          <View style={s.onlineBadge}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>Active now</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={[cardStyle, s.stat]}>
            <Text style={s.statVal}>{user?.phone ? user.phone.slice(0, 4) + '···' : '—'}</Text>
            <Text style={s.statLabel}>Phone</Text>
          </View>
          <View style={[cardStyle, s.stat]}>
            <Text style={s.statVal}>{user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : '—'}</Text>
            <Text style={s.statLabel}>Joined</Text>
          </View>
          <TouchableOpacity style={[cardStyle, s.stat]} onPress={() => user?.privateRoomId
            ? navigation.navigate('Room', { roomId: user.privateRoomId, name: 'My Room' })
            : navigation.navigate('NewRoom')
          }>
            <Text style={[s.statVal, { color: colors.accent }]}>
              {user?.privateRoomId ? 'View' : 'Create'}
            </Text>
            <Text style={s.statLabel}>My Room</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Display name</Text>
          <Input prefix="@" value={handle} onChangeText={setHandle}
            placeholder="handle" maxLength={20} autoCapitalize="none" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Color</Text>
          <View style={s.colorRow}>
            {avatarColors.map(c => (
              <TouchableOpacity key={c} onPress={() => setColor(c)} activeOpacity={0.8}
                style={[s.colorDot, { backgroundColor: c }, color === c && s.colorDotSelected]} />
            ))}
          </View>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
        {saved ? <Text style={s.success}>Profile updated</Text> : null}

        <Button
          label="Save changes"
          onPress={handleSave}
          loading={saving}
          loadingLabel="Saving…"
        />

        <Button variant="danger" label="Sign out" onPress={confirmLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },

  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  handleText: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.text },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(78,201,124,0.1)', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: 'rgba(78,201,124,0.2)',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.online },
  onlineText: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.online },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.text },
  statLabel: { fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.textSecondary },

  colorRow: { flexDirection: 'row', gap: spacing.md },
  colorDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  colorDotSelected: { borderColor: colors.text, transform: [{ scale: 1.12 }] },

  error: { color: colors.error, fontSize: fontSize.small, textAlign: 'center' },
  success: { color: colors.online, fontSize: fontSize.small, textAlign: 'center' },
});

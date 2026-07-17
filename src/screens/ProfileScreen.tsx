import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, Calendar, Hash, ChevronRight, LogOut } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import Header from '../components/Header';
import DiceBearAvatar from '../components/DiceBearAvatar';
import ColorPicker from '../components/ColorPicker';

export default function ProfileScreen({ navigation }: any) {
  const { user, userId, logout } = useAuth();
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [color, setColor] = useState(user?.avatarColor ?? '#E8A840');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const updateProfile = useMutation(api.users.updateProfile);

  async function handleSave() {
    if (!userId || !handle.trim()) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await updateProfile({ userId: userId as any, handle: handle.trim(), avatarColor: color });
      if (res && 'error' in res && res.error) setError(res.error);
      else { setSaved(true); setEditing(false); }
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  function confirmLogout() {
    Alert.alert('Sign out', 'You can sign back in anytime with your phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); navigation.getParent()?.replace('Auth'); } },
    ]);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="Profile" rightLabel="Save" onRightPress={handleSave} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={{ borderRadius: 24, borderWidth: 3, borderColor: colors.borderStrong }}>
            <DiceBearAvatar seed={user?.handle ?? '?'} style="croodles-neutral" size={120} bgColor={user?.avatarColor} />
          </View>

          {editing ? (
            <View style={s.editRow}>
              <Text style={s.editAt}>@</Text>
              <TextInput
                style={s.editInput}
                value={handle}
                onChangeText={setHandle}
                placeholder="handle"
                placeholderTextColor={colors.textMuted}
                maxLength={20}
                autoCapitalize="none"
                autoFocus
                onSubmitEditing={handleSave}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.7}>
              <Text style={s.handle}>@{handle || user?.handle}</Text>
            </TouchableOpacity>
          )}

          <ColorPicker value={color} onChange={setColor} />
          {error ? <Text style={s.error}>{error}</Text> : null}
          {saved ? <Text style={s.success}>Profile updated</Text> : null}
        </View>

        {/* ── Info card ── */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <Phone size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={s.infoText}>{user?.phone ? user.phone.slice(0, 6) + '···' + user.phone.slice(-2) : '—'}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Calendar size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={s.infoText}>
              {user?.createdAt
                ? `Joined ${new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}`
                : '—'}
            </Text>
          </View>
        </View>

        {/* ── My Room ── */}
        <TouchableOpacity
          style={s.card}
          onPress={() => user?.privateRoomId
            ? navigation.navigate('Room', { roomId: user.privateRoomId, name: 'My Room' })
            : navigation.navigate('NewRoom')
          }
          activeOpacity={0.7}
        >
          <View style={s.roomRow}>
            <Hash size={18} color={colors.accent} strokeWidth={2} />
            <Text style={s.roomText}>
              {user?.privateRoomId ? 'Manage your room' : 'Create your room'}
            </Text>
            <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
          </View>
          {user?.privateRoomId ? (
            <Text style={s.roomSub}>Manage settings, members, and bans</Text>
          ) : (
            <Text style={s.roomSub}>One room per account — create yours</Text>
          )}
        </TouchableOpacity>

        {/* ── Sign out ── */}
        <TouchableOpacity style={s.signOut} onPress={confirmLogout} activeOpacity={0.7}>
          <LogOut size={16} color={colors.error} strokeWidth={2} />
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },

  // Hero
  hero: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl },
  handle: { fontSize: fontSize.hero, fontWeight: fontWeight.bold, color: colors.text },
  editRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    backgroundColor: colors.elevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md, height: 44,
  },
  editAt: { color: colors.textSecondary, fontSize: fontSize.body, fontWeight: fontWeight.medium },
  editInput: {
    color: colors.text, fontSize: fontSize.body, fontWeight: fontWeight.semibold,
    paddingVertical: 0, paddingHorizontal: spacing.xs, minWidth: 100,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoText: { fontSize: fontSize.body, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  // Room
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  roomText: { flex: 1, fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },
  roomSub: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: spacing.sm, paddingLeft: 26 },

  // Messages
  error: { color: colors.error, fontSize: fontSize.small, textAlign: 'center' },
  success: { color: colors.online, fontSize: fontSize.small, textAlign: 'center' },

  // Sign out
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signOutText: { color: colors.error, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});

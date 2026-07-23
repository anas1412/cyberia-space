import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, Calendar, Hash, ChevronRight, LogOut, Pencil } from 'lucide-react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import ContentWrap from '../components/ContentWrap';
import Header from '../components/Header';
import DiceBearAvatar from '../components/DiceBearAvatar';
import ColorPicker from '../components/ColorPicker';
import { useAsyncAction } from '../hooks/useAsyncAction';

export default function ProfileScreen({ navigation }: any) {
  const { user, userId, logout } = useAuth();
  const myRoom = useQuery(api.rooms.getMyRoom, userId ? { userId } : 'skip');
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [color, setColor] = useState(user?.avatarColor ?? '#E8A840');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateProfile = useMutation(api.users.updateProfile);
  const { execute: doSave, loading: saving, error: saveError, reset } = useAsyncAction(updateProfile);

  async function handleSave() {
    if (!userId || !handle.trim()) return;
    reset();
    const res = await doSave({ userId, handle: handle.trim(), avatarColor: color });
    if (!res) return;
    setSaved(true);
    setEditing(false);
  }

  async function confirmLogout() {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Auth' }] });
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap>
        <Header
          title="Profile"
          rightContent={
            <TouchableOpacity style={s.editToggle} onPress={() => setEditing(!editing)} activeOpacity={0.7}>
              <Pencil size={16} color={editing ? '#000' : colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          }
        />

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
            <Text style={s.handle}>@{handle || user?.handle}</Text>
          )}

          {editing && (
            <>
              <ColorPicker value={color} onChange={setColor} />
              {saveError ? <Text style={s.error}>{saveError}</Text> : null}
              {saved ? <Text style={s.success}>Profile updated</Text> : null}
              <View style={s.btnRow}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { setEditing(false); reset(); setSaved(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
          onPress={() => myRoom
            ? navigation.navigate('Room', { roomId: myRoom._id })
            : navigation.navigate('NewRoom')
          }
          activeOpacity={0.7}
        >
          <View style={s.roomRow}>
            <Hash size={18} color={colors.accent} strokeWidth={2} />
            <Text style={s.roomText}>
              {myRoom ? 'Manage your room' : 'Create your room'}
            </Text>
            <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
          </View>
          {myRoom ? (
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
      </ContentWrap>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },

  editToggle: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

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

  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: 280,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
  },

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

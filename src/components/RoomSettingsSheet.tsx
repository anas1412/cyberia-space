import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import BottomSheet from './BottomSheet';
import Input from './Input';
import Button from './Button';

interface Props {
  visible: boolean;
  onClose: () => void;
  roomId: any;
  userId: string;
  roomName: string;
  roomTopic?: string;
  roomType?: string;
  createdAt?: number;
}

export default function RoomSettingsSheet({ visible, onClose, roomId, userId, roomName, roomTopic, roomType, createdAt }: Props) {
  const [name, setName] = useState(roomName);
  const [topic, setTopic] = useState(roomTopic ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateRoom = useMutation(api.rooms.update);
  const deleteRoom = useMutation(api.rooms.remove);
  const unbanUser = useMutation(api.rooms.unban);
  const bans = useQuery(api.rooms.listBans, { roomId }) ?? [];

  useEffect(() => {
    if (visible) {
      setName(roomName);
      setTopic(roomTopic ?? '');
      setConfirmDelete(false);
    }
  }, [visible, roomName, roomTopic]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await updateRoom({ roomId, userId: userId as any, name: name.trim(), topic: topic.trim() || undefined });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    await deleteRoom({ roomId, userId: userId as any });
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={s.header}>
        <Text style={s.title}>Room Settings</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* ── Room meta ── */}
        <View style={s.metaRow}>
          {roomType && (
            <View style={[s.badge, roomType === 'private' && s.badgePrivate]}>
              <Text style={[s.badgeText, roomType === 'private' && s.badgeTextPrivate]}>
                {roomType === 'private' ? 'Private' : 'Public'}
              </Text>
            </View>
          )}
          {createdAt && (
            <Text style={s.metaDate}>
              Created {new Date(createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </Text>
          )}
        </View>
        {/* ── Room info ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Room info</Text>
          <Input value={name} onChangeText={setName} placeholder="Room name" maxLength={40} />
          <Input value={topic} onChangeText={setTopic} placeholder="Optional topic" maxLength={100} />

          <View style={s.toggleRow}>
            <TouchableOpacity style={[s.seg, roomType === 'public' && s.segActive]} onPress={() => updateRoom({ roomId, userId: userId as any, type: 'public' })} activeOpacity={0.8}>
              <Text style={[s.segText, roomType === 'public' && s.segTextActive]}>Public</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.seg, roomType === 'private' && s.segActive]} onPress={() => updateRoom({ roomId, userId: userId as any, type: 'private' })} activeOpacity={0.8}>
              <Text style={[s.segText, roomType === 'private' && s.segTextActive]}>Private</Text>
            </TouchableOpacity>
          </View>

          <Button label="Save changes" onPress={handleSave} loading={saving} loadingLabel="Saving…" disabled={!name.trim()} />
        </View>

        {/* ── Banned ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Banned · {(bans as any[]).length}</Text>
          {(bans as any[]).length === 0 ? (
            <Text style={s.empty}>No banned users</Text>
          ) : (
            (bans as any[]).map((b: any) => (
              <View key={b._id} style={s.banRow}>
                <Text style={s.banHandle}>@{b.handle}</Text>
                <TouchableOpacity onPress={() => unbanUser({ roomId, ownerId: userId as any, userId: b.userId })} style={s.unbanBtn}>
                  <Text style={s.unbanText}>Unban</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ── Danger zone ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.error }]}>Danger zone</Text>
          {confirmDelete ? (
            <View style={s.deleteConfirm}>
              <Text style={s.deleteWarn}>Delete "{roomName}" and all its messages?</Text>
              <View style={s.deleteRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setConfirmDelete(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmDeleteBtn} onPress={handleDelete}>
                  <Text style={s.confirmDeleteText}>Delete forever</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(true)} activeOpacity={0.7}>
              <Trash2 size={16} color={colors.error} strokeWidth={2} />
              <Text style={s.deleteText}>Delete room</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing.xl, gap: spacing.xxxl, paddingBottom: spacing.xxxl * 2 },

  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    backgroundColor: colors.accentBg, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: 'rgba(232,168,64,0.2)',
  },
  badgePrivate: {
    backgroundColor: 'rgba(156,156,148,0.1)', borderColor: 'rgba(156,156,148,0.2)',
  },
  badgeText: { color: colors.accent, fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  badgeTextPrivate: { color: colors.textSecondary },
  metaDate: { fontSize: fontSize.caption, color: colors.textMuted },
  idRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  idLabel: { fontSize: fontSize.small, color: colors.textSecondary },
  idValue: { fontSize: fontSize.caption, color: colors.textMuted, maxWidth: '60%' },

  toggleRow: {
    flexDirection: 'row', backgroundColor: colors.elevated,
    borderRadius: radius.md, padding: 3, borderWidth: 1, borderColor: colors.borderStrong,
  },
  seg: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.sm - 2 },
  segActive: { backgroundColor: colors.accent },
  segText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.textMuted },
  segTextActive: { color: '#000' },

  empty: { color: colors.textMuted, fontSize: fontSize.body, paddingVertical: spacing.sm },

  // Banned — reuse styles from MembersSheet
  banRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  banHandle: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.semibold },
  unbanBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.accentBg },
  unbanText: { color: colors.accent, fontSize: fontSize.small, fontWeight: fontWeight.semibold },

  // Delete
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: 'rgba(244,75,66,0.2)',
  },
  deleteText: { color: colors.error, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  deleteConfirm: { gap: spacing.md },
  deleteWarn: { color: colors.textSecondary, fontSize: fontSize.body, textAlign: 'center' },
  deleteRow: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontSize: fontSize.title, fontWeight: fontWeight.semibold },
  confirmDeleteBtn: { flex: 1, backgroundColor: colors.error, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  confirmDeleteText: { color: '#fff', fontSize: fontSize.title, fontWeight: fontWeight.semibold },
});

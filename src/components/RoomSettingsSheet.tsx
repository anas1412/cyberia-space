import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Trash2, UserMinus, Ban } from 'lucide-react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import BottomSheet from './BottomSheet';
import Input from './Input';
import Button from './Button';
import DiceBearAvatar from './DiceBearAvatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  roomId: any;
  userId: string;
  roomName: string;
  roomTopic?: string;
}

export default function RoomSettingsSheet({ visible, onClose, roomId, userId, roomName, roomTopic }: Props) {
  const [name, setName] = useState(roomName);
  const [topic, setTopic] = useState(roomTopic ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateRoom = useMutation(api.rooms.update);
  const deleteRoom = useMutation(api.rooms.remove);
  const kickUser = useMutation(api.rooms.kick);
  const banUser = useMutation(api.rooms.ban);
  const unbanUser = useMutation(api.rooms.unban);
  const bans = useQuery(api.rooms.listBans, { roomId }) ?? [];
  const presence = useQuery(api.rooms.getPresence, { roomId }) ?? [];

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

  const memberList = presence as any[];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={s.header}>
        <Text style={s.title}>Room Settings</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* ── Room info ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Room info</Text>
          <Input value={name} onChangeText={setName} placeholder="Room name" maxLength={40} />
          <Input value={topic} onChangeText={setTopic} placeholder="Optional topic" maxLength={100} />
          <Button label="Save changes" onPress={handleSave} loading={saving} loadingLabel="Saving…" disabled={!name.trim()} />
        </View>

        {/* ── Members ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Members · {memberList.length}</Text>
          {memberList.length === 0 ? (
            <Text style={s.empty}>No one here right now</Text>
          ) : (
            memberList.map((p: any) => {
              const isOwner = p.userId === userId;
              return (
                <View key={p.userId} style={s.memberRow}>
                  <View style={s.memberInfo}>
                    <DiceBearAvatar seed={p.handle} style="croodles-neutral" color={p.avatarColor} />
                    <View>
                      <Text style={s.memberName}>@{p.handle}{isOwner ? ' (you)' : ''}</Text>
                    </View>
                  </View>
                  {!isOwner && (
                    <View style={s.memberActions}>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => kickUser({ roomId, ownerId: userId as any, userId: p.userId })}
                      >
                        <UserMinus size={14} color={colors.textSecondary} strokeWidth={2} />
                        <Text style={s.actionLabel}>Kick</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, s.banBtn]}
                        onPress={() => banUser({ roomId, ownerId: userId as any, userId: p.userId })}
                      >
                        <Ban size={14} color={colors.error} strokeWidth={2} />
                        <Text style={[s.actionLabel, { color: colors.error }]}>Ban</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── Banned ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Banned · {(bans as any[]).length}</Text>
          {(bans as any[]).length === 0 ? (
            <Text style={s.empty}>No banned users</Text>
          ) : (
            (bans as any[]).map((b: any) => (
              <View key={b._id} style={s.memberRow}>
                <Text style={s.memberName}>@{b.handle}</Text>
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

  empty: { color: colors.textMuted, fontSize: fontSize.body, paddingVertical: spacing.sm },

  // Members
  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberName: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.semibold },
  memberActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm, backgroundColor: colors.elevated,
  },
  actionLabel: { fontSize: fontSize.caption, color: colors.textSecondary, fontWeight: fontWeight.medium },
  banBtn: { backgroundColor: 'rgba(244,75,66,0.1)' },

  // Banned
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

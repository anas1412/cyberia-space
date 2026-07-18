import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { X, Trash2, Copy, Link, Plus, Trash } from 'lucide-react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import ResponsiveSheet from './ResponsiveSheet';
import Input from './Input';
import Button from './Button';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  roomId: any;
  userId: string;
  roomName: string;
  roomTopic?: string;
  roomType?: string;
  createdAt?: number;
}

export default function RoomSettingsSheet({ visible, onClose, onDeleted, roomId, userId, roomName, roomTopic, roomType, createdAt }: Props) {
  const [name, setName] = useState(roomName);
  const [topic, setTopic] = useState(roomTopic ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedType, setSelectedType] = useState(roomType);

  const updateRoom = useMutation(api.rooms.update);
  const deleteRoom = useMutation(api.rooms.remove);
  const unbanUser = useMutation(api.rooms.unban);
  const bans = useQuery(api.rooms.listBans, { roomId }) ?? [];
  const generateInvite = useMutation(api.rooms.generateInvite);
  const revokeInvite = useMutation(api.rooms.revokeInvite);
  const createGuestLink = useMutation(api.rooms.createGuestLink);
  const revokeGuestLink = useMutation(api.rooms.revokeGuestLink);
  const invites = useQuery(api.rooms.listInvites, roomId ? { roomId, userId: userId as any } : 'skip') ?? [];
  const guestLinks = useQuery(api.rooms.listGuestLinks, roomId ? { roomId, userId: userId as any } : 'skip') ?? [];
  const [inviteMulti, setInviteMulti] = useState(false);
  const [inviteExpiry, setInviteExpiry] = useState(24);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    if (visible) {
      setName(roomName);
      setTopic(roomTopic ?? '');
      setSelectedType(roomType);
      setConfirmDelete(false);
    }
  }, [visible, roomName, roomTopic, roomType]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await updateRoom({ roomId, userId: userId as any, name: name.trim(), topic: topic.trim() || undefined, type: selectedType as any });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    try {
      await deleteRoom({ roomId, userId: userId as any });
      onDeleted?.();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete room');
    }
  }

  return (
    <ResponsiveSheet visible={visible} onClose={onClose}>
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
            <View style={[s.badge, roomType === 'hidden' && s.badgePrivate]}>
              <Text style={[s.badgeText, roomType === 'hidden' && s.badgeTextPrivate]}>
                {roomType === 'public' ? 'Public' : roomType === 'invite' ? 'Invite' : 'Hidden'}
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
            {(['public', 'invite', 'hidden'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.seg, selectedType === t && s.segActive]}
                onPress={() => setSelectedType(t)}
                activeOpacity={0.8}
              >
                <Text style={[s.segText, selectedType === t && s.segTextActive]}>
                  {t === 'public' ? 'Public' : t === 'invite' ? 'Invite' : 'Hidden'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button label="Save changes" onPress={handleSave} loading={saving} loadingLabel="Saving…" disabled={!name.trim()} />
        </View>

        {/* ── Invite codes (invite rooms only) ── */}
        {roomType === 'invite' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Invite Codes · {invites.length}</Text>
            {invites.map((inv: any) => (
              <View key={inv._id} style={s.inviteRow}>
                <View>
                  <Text style={s.codeText}>{inv.code}</Text>
                  <Text style={s.codeMeta}>
                    {inv.multiUse ? 'Multi-use' : 'Single use'} · {inv.useCount} used · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity style={s.copyBtn} onPress={() => Alert.alert('Invite code', inv.code)}>
                    <Copy size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.copyBtn} onPress={() => revokeInvite({ roomId, userId: userId as any, inviteId: inv._id })}>
                    <Trash size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {generatedCode ? (
              <View style={s.generatedBox}>
                <Text style={s.generatedLabel}>New code (copy it now)</Text>
                <Text style={s.generatedCode}>{generatedCode}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={[s.optBtn, !inviteMulti && s.optBtnActive]} onPress={() => setInviteMulti(false)}>
                <Text style={[s.optBtnText, !inviteMulti && s.optBtnTextActive]}>Single use</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.optBtn, inviteMulti && s.optBtnActive]} onPress={() => setInviteMulti(true)}>
                <Text style={[s.optBtnText, inviteMulti && s.optBtnTextActive]}>Multi-use</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[1, 24, 168, 0].map((h) => (
                <TouchableOpacity key={h} style={[s.optBtn, inviteExpiry === h && s.optBtnActive]} onPress={() => setInviteExpiry(h)}>
                  <Text style={[s.optBtnText, inviteExpiry === h && s.optBtnTextActive]}>{h === 0 ? 'Never' : h === 1 ? '1h' : h === 24 ? '24h' : '7d'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.genBtn} onPress={async () => {
              const res = await generateInvite({ roomId, userId: userId as any, multiUse: inviteMulti, expiresInHours: inviteExpiry || undefined });
              setGeneratedCode(res.code);
            }}>
              <Plus size={14} color={colors.accent} />
              <Text style={s.genBtnText}>Generate code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Guest links (all types) ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Guest Links · {guestLinks.length}</Text>
          {guestLinks.map((gl: any) => (
            <View key={gl._id} style={s.inviteRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.codeText} numberOfLines={1}>{gl.token.slice(0, 12)}…</Text>
                <Text style={s.codeMeta}>
                  {gl.multiUse ? 'Multi-use' : 'Single use'} · {gl.useCount} used · Expires {new Date(gl.expiresAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity style={s.copyBtn} onPress={() => Alert.alert('Guest link', `https://chat.cyberiaspace.app/guest/${gl.token}`)}>
                  <Copy size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s.copyBtn} onPress={() => revokeGuestLink({ roomId, userId: userId as any, guestId: gl._id })}>
                  <Trash size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {generatedLink ? (
            <View style={s.generatedBox}>
              <Text style={s.generatedLabel}>New guest link</Text>
              <Text style={s.generatedCode} numberOfLines={1}>chat.cyberiaspace.app/guest/{generatedLink}</Text>
              <TouchableOpacity style={s.copyBtn} onPress={() => Alert.alert('Guest link', `https://chat.cyberiaspace.app/guest/${generatedLink}`)}>
                <Text style={s.copyText}>Show link</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={s.genBtn} onPress={async () => {
            const res = await createGuestLink({ roomId, userId: userId as any, multiUse: inviteMulti, expiresInHours: inviteExpiry || undefined });
            setGeneratedLink(res.token);
          }}>
            <Link size={14} color={colors.accent} />
            <Text style={s.genBtnText}>Generate guest link</Text>
          </TouchableOpacity>
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
    </ResponsiveSheet>
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

  // Invite codes & guest links
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  codeText: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.text, letterSpacing: 1 },
  codeMeta: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
  copyBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  copyText: { color: colors.accent, fontSize: fontSize.small, fontWeight: fontWeight.semibold },
  optBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border },
  optBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  optBtnText: { fontSize: fontSize.caption, fontWeight: fontWeight.medium, color: colors.textSecondary },
  optBtnTextActive: { color: '#000', fontWeight: fontWeight.semibold },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: 'rgba(232,168,64,0.3)', borderStyle: 'dashed',
  },
  genBtnText: { color: colors.accent, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  generatedBox: {
    backgroundColor: colors.accentBg, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(232,168,64,0.2)', gap: spacing.sm, alignItems: 'center',
  },
  generatedLabel: { fontSize: fontSize.caption, color: colors.accent, fontWeight: fontWeight.semibold },
  generatedCode: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 3 },
});

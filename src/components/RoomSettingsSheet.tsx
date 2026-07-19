import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { X, Trash2, Copy, RefreshCw, Check, QrCode } from 'lucide-react-native';
import { useMutation, useQuery } from 'convex/react';

let QRCodeSVG: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  QRCodeSVG = require('react-native-qrcode-svg');
}

async function copyToClipboard(text: string) {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(text);
  } else {
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(text);
  }
}
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

const INVITE_BASE = 'https://chat.cyberiaspace.app/invite';

export default function RoomSettingsSheet({ visible, onClose, onDeleted, roomId, userId, roomName, roomTopic, roomType, createdAt }: Props) {
  const [name, setName] = useState(roomName);
  const [topic, setTopic] = useState(roomTopic ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedType, setSelectedType] = useState(roomType);
  const [copiedField, setCopiedField] = useState<'link' | 'password' | null>(null);
  const [showQR, setShowQR] = useState(false);

  const updateRoom = useMutation(api.rooms.update);
  const deleteRoom = useMutation(api.rooms.remove);
  const unbanUser = useMutation(api.rooms.unban);
  const bans = useQuery(api.rooms.listBans, { roomId }) ?? [];
  const password = useQuery(api.rooms.getPassword, roomId ? { roomId, userId: userId as any } : 'skip');
  const regeneratePw = useMutation(api.rooms.regeneratePassword);

  useEffect(() => {
    if (visible) {
      setName(roomName);
      setTopic(roomTopic ?? '');
      setSelectedType(roomType);
      setConfirmDelete(false);
      setCopiedField(null);
    }
  }, [visible, roomName, roomTopic, roomType]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await updateRoom({ roomId, userId: userId as any, name: name.trim(), topic: topic.trim() || undefined, type: selectedType as any });
    setSaving(false);
  }

  async function handleDelete() {
    try {
      await deleteRoom({ roomId, userId: userId as any });
      onDeleted?.();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete room');
    }
  }

  async function handleCopy(text: string, field: 'link' | 'password') {
    await copyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  const inviteLink = selectedType === 'private' && password
    ? `${INVITE_BASE}/${roomId}/${password}`
    : `${INVITE_BASE}/${roomId}`;

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
                {roomType === 'public' ? 'Public' : roomType === 'private' ? 'Private' : 'Hidden'}
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
            {(['public', 'private', 'hidden'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.seg, selectedType === t && s.segActive]}
                onPress={() => setSelectedType(t)}
                activeOpacity={0.8}
              >
                <Text style={[s.segText, selectedType === t && s.segTextActive]}>
                  {t === 'public' ? 'Public' : t === 'private' ? 'Private' : 'Hidden'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button label="Save changes" onPress={handleSave} loading={saving} loadingLabel="Saving…" disabled={!name.trim()} />
        </View>

        {/* ── Access ── */}
        <View style={s.section}>
          {selectedType === 'private' && (
            <View style={s.passwordRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.passwordLabel}>Password</Text>
                <Text style={s.passwordValue}>{password}</Text>
              </View>
              <TouchableOpacity style={s.copyBtn} onPress={() => handleCopy(password ?? '', 'password')}>
                {copiedField === 'password'
                  ? <Check size={14} color="#4ade80" />
                  : <Copy size={14} color={colors.textSecondary} />}
              </TouchableOpacity>
              <TouchableOpacity style={s.copyBtn} onPress={async () => {
                const res = await regeneratePw({ roomId, userId: userId as any });
                Alert.alert('New password', res.password);
              }}>
                <RefreshCw size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={s.inviteChips}>
            <TouchableOpacity
              style={s.inviteChip}
              onPress={() => handleCopy(inviteLink, 'link')}
              activeOpacity={0.7}
            >
              {copiedField === 'link'
                ? <Check size={14} color="#000" />
                : <Copy size={14} color="#000" />}
              <Text style={s.inviteChipText}>
                {copiedField === 'link' ? 'Copied!' : 'Copy invite link'}
              </Text>
            </TouchableOpacity>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={s.inviteChip}
                onPress={() => setShowQR(true)}
                activeOpacity={0.7}
              >
                <QrCode size={14} color="#000" />
                <Text style={s.inviteChipText}>QR code</Text>
              </TouchableOpacity>
            )}
          </View>
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

      {/* QR Code Modal (native only) */}
      {showQR && QRCodeSVG && (
        <View style={s.qrOverlay} onTouchEnd={() => setShowQR(false)}>
          <View style={s.qrCard} onTouchEnd={(e) => e.stopPropagation()}>
            <Text style={s.qrTitle}>{roomName}</Text>
            <View style={s.qrBox}>
              <QRCodeSVG value={inviteLink} size={200} bgColor="#fff" fgColor="#000" />
            </View>
            <Text style={s.qrSub}>Scan to join</Text>
            <TouchableOpacity style={s.qrClose} onPress={() => setShowQR(false)}>
              <Text style={s.qrCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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

  toggleRow: {
    flexDirection: 'row', backgroundColor: colors.elevated,
    borderRadius: radius.md, padding: 3, borderWidth: 1, borderColor: colors.borderStrong,
  },
  seg: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.sm - 2 },
  segActive: { backgroundColor: colors.accent },
  segText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.textMuted },
  segTextActive: { color: '#000' },

  empty: { color: colors.textMuted, fontSize: fontSize.body, paddingVertical: spacing.sm },

  passwordRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  passwordLabel: { fontSize: fontSize.small, color: colors.textMuted, marginBottom: 2 },
  passwordValue: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 2 },

  copyBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  banRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  banHandle: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.semibold },
  unbanBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.accentBg },
  unbanText: { color: colors.accent, fontSize: fontSize.small, fontWeight: fontWeight.semibold },

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

  inviteChips: {
    flexDirection: 'row', gap: spacing.sm,
  },
  inviteChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  inviteChipText: { color: '#000', fontSize: fontSize.body, fontWeight: fontWeight.semibold },

  qrOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  qrCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.xxl, alignItems: 'center', gap: spacing.lg,
    borderWidth: 1, borderColor: colors.borderStrong,
    width: 280,
  },
  qrTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.text },
  qrBox: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.lg },
  qrSub: { fontSize: fontSize.caption, color: colors.textMuted },
  qrClose: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    backgroundColor: colors.elevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  qrCloseText: { color: colors.text, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});

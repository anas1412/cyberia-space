import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, UserMinus, Ban, Crown } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { friendlyError } from '../lib/errors';
import ResponsiveSheet from './ResponsiveSheet';
import ConfirmDialog from './ConfirmDialog';
import DiceBearAvatar from './DiceBearAvatar';
import type { Id } from '../../convex/_generated/dataModel';
import type { PresenceMember } from '../types/convex';

interface Props {
  visible: boolean;
  onClose: () => void;
  roomId: Id<"rooms">;
  userId: Id<"users">;
  isOwner: boolean;
  ownerId?: string;
  members: PresenceMember[];
}

export default function MembersSheet({ visible, onClose, roomId, userId, isOwner, ownerId, members }: Props) {
  const kickUser = useMutation(api.rooms.kick);
  const banUser = useMutation(api.rooms.ban);
  const [kicking, setKicking] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    type: 'kick' | 'ban';
    member: PresenceMember;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openKick(member: PresenceMember) {
    setConfirmState({ type: 'kick', member });
  }

  function openBan(member: PresenceMember) {
    setConfirmState({ type: 'ban', member });
  }

  async function handleConfirm() {
    if (!confirmState) return;
    const { type, member } = confirmState;

    setError(null);
    if (type === 'kick') {
      setKicking(member.userId);
      try {
        await kickUser({ roomId, ownerId: userId, userId: member.userId });
      } catch (e: any) {
        setError(friendlyError(e.data?.message ?? e.message));
      }
      setKicking(null);
    } else {
      try {
        await banUser({ roomId, ownerId: userId, userId: member.userId });
      } catch (e: any) {
        setError(friendlyError(e.data?.message ?? e.message));
      }
    }
    setConfirmState(null);
  }

  const kickMsg = confirmState?.type === 'kick'
    ? (confirmState.member.isGuest
      ? `Remove @${confirmState.member.handle}? They'll be removed and won't be able to return.`
      : `Kick @${confirmState.member.handle} from the room?`)
    : '';

  const banMsg = confirmState?.type === 'ban'
    ? `Ban @${confirmState.member.handle}? They won't be able to rejoin.`
    : '';

  return (
    <ResponsiveSheet visible={visible} onClose={onClose}>
      <View style={s.header}>
        <Text style={s.title}>Members · {members.length}</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {members.length === 0 ? (
          <Text style={s.empty}>No one here right now</Text>
        ) : (
          members.map((p: any) => {
            const isSelf = p.userId === userId;
            const isRoomOwner = ownerId && p.userId === ownerId;
            return (
              <View key={p.userId} style={s.row}>
                <View style={s.user}>
                  <DiceBearAvatar seed={p.handle} style="croodles-neutral" size={36} bgColor={p.avatarColor} />
                  <View>
                    <Text style={s.handle}>@{p.handle}{isSelf ? ' (you)' : ''}</Text>
                    {p.isGuest && <Text style={s.guestTag}>guest</Text>}
                  </View>
                </View>
                {isRoomOwner && (
                  <Crown size={16} color="#F0B90B" strokeWidth={2} />
                )}
                {!isRoomOwner && isOwner && !isSelf && (
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={s.kickBtn}
                      disabled={kicking === p.userId}
                      onPress={() => openKick(p)}
                    >
                      <UserMinus size={14} color={colors.textSecondary} strokeWidth={2} />
                      <Text style={s.kickLabel}>{kicking === p.userId ? '...' : 'Kick'}</Text>
                    </TouchableOpacity>
                    {!p.isGuest && (
                      <TouchableOpacity style={s.banBtn} onPress={() => openBan(p)}>
                        <Ban size={14} color={colors.error} strokeWidth={2} />
                        <Text style={s.banLabel}>Ban</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmState !== null}
        onClose={() => setConfirmState(null)}
        onConfirm={handleConfirm}
        title={confirmState?.type === 'kick' ? 'Kick member' : 'Ban member'}
        message={confirmState?.type === 'kick' ? kickMsg : banMsg}
        confirmLabel={confirmState?.type === 'kick' ? 'Kick' : 'Ban'}
        danger={confirmState?.type === 'ban'}
      />
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
  body: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl * 2 },

  empty: { color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center', paddingVertical: spacing.xxl },
  error: { color: colors.error, fontSize: fontSize.small, textAlign: 'center', paddingBottom: spacing.sm },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  user: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  handle: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.semibold },
  guestTag: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 1 },

  actions: { flexDirection: 'row', gap: spacing.sm },
  kickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm, backgroundColor: colors.elevated,
  },
  kickLabel: { fontSize: fontSize.caption, color: colors.textSecondary, fontWeight: fontWeight.medium },
  banBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm, backgroundColor: 'rgba(244,75,66,0.1)',
  },
  banLabel: { fontSize: fontSize.caption, color: colors.error, fontWeight: fontWeight.medium },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { X, UserMinus, Ban, Crown } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import ResponsiveSheet from './ResponsiveSheet';
import DiceBearAvatar from './DiceBearAvatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  roomId: any;
  userId: string;
  isOwner: boolean;
  ownerId?: string;
  members: any[];
}

function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(message));
    } else {
      Alert.alert('Confirm', message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'OK', onPress: () => resolve(true) },
      ]);
    }
  });
}

export default function MembersSheet({ visible, onClose, roomId, userId, isOwner, ownerId, members }: Props) {
  const kickUser = useMutation(api.rooms.kick);
  const banUser = useMutation(api.rooms.ban);
  const [kicking, setKicking] = useState<string | null>(null);

  async function handleKick(member: any) {
    const msg = member.isGuest
      ? `Remove @${member.handle}? They'll be removed and won't be able to return.`
      : `Kick @${member.handle} from the room?`;
    const ok = await confirm(msg);
    if (!ok) return;
    setKicking(member.userId);
    try {
      const res = await kickUser({ roomId, ownerId: userId as any, userId: member.userId });
      if (res?.wasGuest) {
        // Guest account was deleted, they'll detect it on next query
      }
    } catch (e) {
      console.error('Kick failed:', e);
    }
    setKicking(null);
  }

  async function handleBan(member: any) {
    const ok = await confirm(`Ban @${member.handle}? They won't be able to rejoin.`);
    if (!ok) return;
    try {
      await banUser({ roomId, ownerId: userId as any, userId: member.userId });
    } catch (e) {
      console.error('Ban failed:', e);
    }
  }

  return (
    <ResponsiveSheet visible={visible} onClose={onClose}>
      <View style={s.header}>
        <Text style={s.title}>Members · {members.length}</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
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
                      onPress={() => handleKick(p)}
                    >
                      <UserMinus size={14} color={colors.textSecondary} strokeWidth={2} />
                      <Text style={s.kickLabel}>{kicking === p.userId ? '...' : 'Kick'}</Text>
                    </TouchableOpacity>
                    {!p.isGuest && (
                      <TouchableOpacity style={s.banBtn} onPress={() => handleBan(p)}>
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

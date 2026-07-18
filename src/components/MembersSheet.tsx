import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, UserMinus, Ban } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import BottomSheet from './BottomSheet';
import DiceBearAvatar from './DiceBearAvatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  roomId: any;
  userId: string;
  isOwner: boolean;
  members: any[];
}

export default function MembersSheet({ visible, onClose, roomId, userId, isOwner, members }: Props) {
  const kickUser = useMutation(api.rooms.kick);
  const banUser = useMutation(api.rooms.ban);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
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
            return (
              <View key={p.userId} style={s.row}>
                <View style={s.user}>
                  <DiceBearAvatar seed={p.handle} style="croodles-neutral" size={36} bgColor={p.avatarColor} />
                  <Text style={s.handle}>@{p.handle}{isSelf ? ' (you)' : ''}</Text>
                </View>
                {isOwner && !isSelf && (
                  <View style={s.actions}>
                    <TouchableOpacity style={s.kickBtn} onPress={() => kickUser({ roomId, ownerId: userId as any, userId: p.userId })}>
                      <UserMinus size={14} color={colors.textSecondary} strokeWidth={2} />
                      <Text style={s.kickLabel}>Kick</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.banBtn} onPress={() => banUser({ roomId, ownerId: userId as any, userId: p.userId })}>
                      <Ban size={14} color={colors.error} strokeWidth={2} />
                      <Text style={s.banLabel}>Ban</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
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
  body: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl * 2 },

  empty: { color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center', paddingVertical: spacing.xxl },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  user: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  handle: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.semibold },

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

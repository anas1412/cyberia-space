import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserMinus, DoorOpen } from 'lucide-react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { useAuth } from '../context/AuthContext';
import { clearLastRoom } from '../lib/storage';

export default function KickedScreen({ route, navigation }: any) {
  const { roomName, reason = 'kicked', isGuest = false } = route.params ?? {};
  const { logout } = useAuth();

  useEffect(() => {
    if (isGuest) {
      clearLastRoom();
      logout().catch(() => {});
    }
  }, []);

  const isRoomDeleted = reason === 'room-deleted';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <View style={s.iconWrap}>
          {isRoomDeleted ? (
            <DoorOpen size={48} color={colors.textSecondary} strokeWidth={1.5} />
          ) : (
            <UserMinus size={48} color={colors.error} strokeWidth={1.5} />
          )}
        </View>
        <Text style={s.title}>
          {isRoomDeleted ? 'Room deleted' : 'Removed from room'}
        </Text>
        <Text style={s.sub}>
          {isRoomDeleted
            ? 'This room no longer exists'
            : roomName
              ? `You were removed from #${roomName}`
              : 'You were removed from this room'}
        </Text>
        {isGuest ? (
          <TouchableOpacity style={s.btn} onPress={() => navigation.replace('Auth')} activeOpacity={0.8}>
            <Text style={s.btnText}>Log in</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.btnOutline} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={s.btnOutlineText}>Go back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, padding: spacing.xxl },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(244,75,66,0.1)', borderWidth: 1, borderColor: 'rgba(244,75,66,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' },
  sub: { fontSize: fontSize.body, color: colors.textSecondary, textAlign: 'center' },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  btnText: { color: '#000', fontSize: fontSize.title, fontWeight: fontWeight.semibold },
  btnOutline: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.md,
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  btnOutlineText: { color: colors.text, fontSize: fontSize.title, fontWeight: fontWeight.semibold },
});

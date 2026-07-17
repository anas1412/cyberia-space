import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { card, sectionLabel } from '../lib/sharedStyles';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function DMListScreen({ navigation }: any) {
  const { userId } = useAuth();
  const dms = useQuery(api.dms.listForUser, userId ? { userId: userId as any } : 'skip') ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="Messages" rightLabel="New" onRightPress={() => navigation.navigate('NewDM')} />

      <FlatList
        data={dms}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          dms.length > 0 ? <Text style={[sectionLabel, { marginBottom: spacing.sm }]}>Direct Messages</Text> : null
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity style={[card, s.dmCard]}
            onPress={() => navigation.navigate('DM', { conversationId: item._id })}
            activeOpacity={0.8}>
            <View style={[s.avatar, { backgroundColor: item.other?.avatarColor ?? colors.accent }]}>
              <Text style={s.avatarText}>{(item.other?.handle ?? '?').charAt(0).toUpperCase()}</Text>
              {item.unreadCount > 0 && <View style={s.unreadDot} />}
            </View>
            <View style={s.info}>
              <View style={s.topRow}>
                <Text style={[s.handle, item.unreadCount > 0 && s.handleUnread]}>
                  @{item.other?.handle ?? '…'}
                </Text>
                <Text style={s.time}>{formatRelative(item.lastMessageAt)}</Text>
              </View>
              <Text style={[s.preview, item.unreadCount > 0 && s.previewUnread]} numberOfLines={1}>
                {item.lastMessageText || 'No messages yet'}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No messages yet"
            subtitle="Start a conversation with anyone"
            actionLabel="New message"
            onAction={() => navigation.navigate('NewDM')}
          />
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },

  dmCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  avatar: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative',
  },
  avatarText: { color: '#000', fontSize: fontSize.header, fontWeight: fontWeight.bold },
  unreadDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface,
  },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  handle: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },
  handleUnread: { fontWeight: fontWeight.bold },
  time: { fontSize: fontSize.caption, color: colors.textMuted },
  preview: { fontSize: fontSize.body, color: colors.textSecondary, lineHeight: 20 },
  previewUnread: { color: colors.text, fontWeight: fontWeight.medium },
  badge: {
    backgroundColor: colors.accent, borderRadius: 12,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#000', fontSize: 11, fontWeight: fontWeight.bold },
});

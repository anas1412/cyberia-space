import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { card, sectionLabel } from '../lib/sharedStyles';
import ContentWrap from '../components/ContentWrap';
import DiceBearAvatar from '../components/DiceBearAvatar';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function DMListScreen({ navigation }: any) {
  const { userId } = useAuth();
  const dms = useQuery(api.dms.listForUser, userId ? { userId: userId as any } : 'skip');
  const [query, setQuery] = useState('');

  if (dms === undefined) return <SafeAreaView style={s.container} edges={['top']}><ContentWrap><Header title="Messages" /><Loading /></ContentWrap></SafeAreaView>;

  const filtered = query.trim()
    ? dms.filter((d: any) => d.other?.handle?.toLowerCase().includes(query.toLowerCase()))
    : dms;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap>
        <Header title="Messages" />

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg }}>
            <View style={s.searchRow}>
              <View style={s.searchWrap}>
                <SearchBar value={query} onChangeText={setQuery} placeholder="Search messages…" />
              </View>
              <TouchableOpacity style={s.newBtn} onPress={() => navigation.navigate('NewDM')} activeOpacity={0.7}>
                <Plus size={18} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={[sectionLabel, { marginBottom: spacing.sm }]}>Direct Messages</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity style={[card, s.dmCard]}
            onPress={() => navigation.navigate('DM', { conversationId: item._id })}
            activeOpacity={0.8}>
            <View>
              <DiceBearAvatar seed={item.other?.handle ?? '?'} style="croodles-neutral" size={40} bgColor={item.other?.avatarColor} />
            </View>
            <View style={s.info}>
              <View style={s.topRow}>
                <View style={s.handleRow}>
                  <Text style={[s.handle, item.unreadCount > 0 && s.handleUnread]}>
                    @{item.other?.handle ?? '…'}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.time}>{formatRelative(item.lastMessageAt)}</Text>
              </View>
              <Text style={[s.preview, item.unreadCount > 0 && s.previewUnread]} numberOfLines={1}>
                {item.lastMessageText || 'No messages yet'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View>
            <Text style={[sectionLabel, { marginTop: spacing.md, marginBottom: spacing.sm }]}>Direct Messages</Text>
            {query.trim() ? (
            <View style={{ paddingTop: 40 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }}>
                No results for "{query}"
              </Text>
            </View>
          ) : (
            <EmptyState
              title="No messages yet"
              subtitle="Start a conversation with anyone"
              actionLabel="New message"
              onAction={() => navigation.navigate('NewDM')}
            />
          )}
          </View>
        }
      />
      </ContentWrap>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  searchWrap: { flex: 1 },
  newBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  dmCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },

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
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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

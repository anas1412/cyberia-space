import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Lock, EyeOff, SlidersHorizontal } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePaginatedQuery, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { card, sectionLabel } from '../lib/sharedStyles';
import ContentWrap from '../components/ContentWrap';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import DiceBearAvatar from '../components/DiceBearAvatar';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';
import Input from '../components/Input';

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return `${Math.floor(diff / 604800000)}w`;
}

export default function RoomsListScreen({ navigation }: any) {
  const { user, userId } = useAuth();
  const { results: rooms, loadMore, isLoading, status } = usePaginatedQuery(
    api.rooms.listPublic,
    { userId: userId as any },
    { initialNumItems: 20 },
  );
  const discoverableCount = useQuery(api.rooms.getDiscoverableCount) ?? 0;
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'active'>('newest');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersActive = typeFilter !== 'all' || sortBy !== 'newest' || onlineOnly;
  const [loaded, setLoaded] = useState(false);
  const [codeModal, setCodeModal] = useState<{ visible: boolean; roomId?: string; roomName?: string }>({ visible: false });
  const [inviteCode, setInviteCode] = useState('');
  const joinRoom = useMutation(api.rooms.join);

  useEffect(() => {
    AsyncStorage.getItem('rooms_filters').then((raw) => {
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.typeFilter) setTypeFilter(saved.typeFilter);
        if (saved.sortBy) setSortBy(saved.sortBy);
        if (saved.onlineOnly !== undefined) setOnlineOnly(saved.onlineOnly);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('rooms_filters', JSON.stringify({ typeFilter, sortBy, onlineOnly }));
  }, [typeFilter, sortBy, onlineOnly, loaded]);

  const allRooms = rooms ?? [];
  const myRoom = allRooms.find((r: any) => r.ownerHandle === user?.handle);

  const filtered = useMemo(() => {
    let result = allRooms.filter((r: any) => r.ownerHandle !== user?.handle);
    if (typeFilter !== 'all') result = result.filter((r: any) => r.type === typeFilter);
    if (onlineOnly) result = result.filter((r: any) => r.memberCount > 0);
    if (query.trim()) result = result.filter((r: any) => r.name.toLowerCase().includes(query.toLowerCase()) || r.topic?.toLowerCase().includes(query.toLowerCase()));
    result = [...result].sort((a: any, b: any) => sortBy === 'active' ? b.memberCount - a.memberCount : b.createdAt - a.createdAt);
    return result;
  }, [allRooms, user?.handle, typeFilter, sortBy, onlineOnly, query]);

  if (isLoading && allRooms.length === 0) return <SafeAreaView style={s.container} edges={['top']}><ContentWrap><Header title="Rooms" /><Loading /></ContentWrap></SafeAreaView>;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap>
        <Header
          title="Rooms"
          rightLabel={user?.privateRoomId ? undefined : 'New'}
          onRightPress={() => navigation.navigate('NewRoom')}
        />

        <FlatList
        data={filtered}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (status === 'CanLoadMore') loadMore(20); }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={s.listHead}>
            <View style={s.searchRow}>
              <View style={s.searchWrap}>
                <SearchBar value={query} onChangeText={setQuery} placeholder="Search rooms…" />
              </View>
              <TouchableOpacity
                style={[s.filterBtn, filtersActive && s.filterBtnActive]}
                onPress={() => setFiltersOpen(!filtersOpen)}
                activeOpacity={0.7}>
                <SlidersHorizontal size={18} color={filtersActive ? '#000' : colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {filtersOpen && (
              <View style={s.filterPanel}>
                <View style={s.filterSection}>
                  <Text style={s.filterLabel}>Type</Text>
                  <View style={s.segRow}>
                    {(['all', 'public', 'private'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[s.seg, typeFilter === t && s.segActive]}
                        onPress={() => setTypeFilter(t)}
                        activeOpacity={0.7}>
                        <Text style={[s.segText, typeFilter === t && s.segTextActive]}>
                          {t === 'all' ? 'All' : t === 'public' ? 'Public' : 'Private'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={s.filterSection}>
                  <Text style={s.filterLabel}>Sort</Text>
                  <View style={s.segRow}>
                    {(['newest', 'active'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[s.seg, sortBy === t && s.segActive]}
                        onPress={() => setSortBy(t)}
                        activeOpacity={0.7}>
                        <Text style={[s.segText, sortBy === t && s.segTextActive]}>
                          {t === 'newest' ? 'Newest' : 'Active'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={s.filterSection}>
                  <Text style={s.filterLabel}>Availability</Text>
                  <TouchableOpacity
                    style={[s.seg, onlineOnly && s.segActive]}
                    onPress={() => setOnlineOnly(!onlineOnly)}
                    activeOpacity={0.7}>
                    <Text style={[s.segText, onlineOnly && s.segTextActive]}>
                      Online only
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {!query.trim() && myRoom && (
              <View>
                <Text style={[sectionLabel, { marginBottom: spacing.sm }]}>My Room</Text>
                <TouchableOpacity style={[card, s.roomCard]}
                  onPress={() => navigation.navigate('Room', { roomId: myRoom._id })}
                  activeOpacity={0.8}>
                  <DiceBearAvatar seed={myRoom.name} style="glass" size={40} bgColor={myRoom.ownerColor} />
                  <View style={s.roomInfo}>
                    <View style={s.nameRow}>
                      <Text style={s.roomName} numberOfLines={1}>{myRoom.name}</Text>
                      {myRoom.type === 'public' && <Users size={12} color={colors.textMuted} strokeWidth={2} />}
                      {myRoom.type === 'private' && <Lock size={12} color={colors.textMuted} strokeWidth={2} />}
                      {myRoom.type === 'hidden' && <EyeOff size={12} color={colors.textMuted} strokeWidth={2} />}
                    </View>
                    {myRoom.topic ? <Text style={s.roomTopic} numberOfLines={1}>{myRoom.topic}</Text> : null}
                  </View>
                  <View style={s.roomMeta}>
                    {myRoom.memberCount > 0 && <Text style={s.memberCount}>{myRoom.memberCount} online</Text>}
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {!query.trim() && !myRoom && (
              <View>
                <Text style={[sectionLabel, { marginBottom: spacing.sm }]}>My Room</Text>
                <TouchableOpacity style={[card, s.createCard]} onPress={() => navigation.navigate('NewRoom')} activeOpacity={0.7}>
                  <View style={s.createIcon}><Text style={s.createIconText}>+</Text></View>
                  <View>
                    <Text style={s.createTitle}>Create your room</Text>
                    <Text style={s.createSub}>One room per account</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            <Text style={[sectionLabel, { marginBottom: spacing.sm }]}>All Rooms ({discoverableCount}/100)</Text>
          </View>
        }
        renderItem={({ item }: any) => {
          const isMine = item.ownerHandle === user?.handle;
          return (
            <TouchableOpacity style={[card, s.roomCard]}
              onPress={() => {
                if (item.type === 'private' && !isMine) {
                  setCodeModal({ visible: true, roomId: item._id, roomName: item.name });
                } else {
                  navigation.navigate('Room', { roomId: item._id });
                }
              }}
              activeOpacity={0.8}>
              <DiceBearAvatar seed={item.name} style="glass" size={40} bgColor={item.ownerColor} />
              <View style={s.roomInfo}>
                <View style={s.nameRow}>
                  <Text style={s.roomName} numberOfLines={1}>{item.name}</Text>
                  {item.type === 'public' && <Users size={12} color={colors.textMuted} strokeWidth={2} />}
                  {item.type === 'private' && <Lock size={12} color={colors.textMuted} strokeWidth={2} />}
                  {item.type === 'hidden' && <EyeOff size={12} color={colors.textMuted} strokeWidth={2} />}
                </View>
                {item.topic ? <Text style={s.roomTopic} numberOfLines={1}>{item.topic}</Text> : null}
                <Text style={s.roomOwner}>by @{item.ownerHandle}</Text>
              </View>
              <View style={s.roomMeta}>
                <Text style={s.roomTime}>{formatRelative(item.createdAt)}</Text>
                {item.memberCount > 0 && <Text style={s.memberCount}>{item.memberCount} online</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          query.trim() ? (
            <View style={{ paddingTop: 40 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }}>
                No results for "{query}"
              </Text>
            </View>
          ) : (
            <EmptyState
              title="No rooms yet"
            />
          )
        }
      />

      {/* ── Password Modal ── */}
      {codeModal.visible && (
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Join {codeModal.roomName}</Text>
            <Text style={s.modalSub}>This room requires a password</Text>
            <Input
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase().slice(0, 6))}
              placeholder="Enter 6‑char password"
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={s.modalCancel} onPress={() => { setCodeModal({ visible: false }); setInviteCode(''); }}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalJoin, inviteCode.length < 6 && { opacity: 0.4 }]}
                disabled={inviteCode.length < 6}
                onPress={async () => {
                  await joinRoom({ roomId: codeModal.roomId as any, userId: userId as any, password: inviteCode });
                  setCodeModal({ visible: false }); setInviteCode('');
                  navigation.navigate('Room', { roomId: codeModal.roomId, password: inviteCode });
                }}
              >
                <Text style={s.modalJoinText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      </ContentWrap>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHead: { gap: spacing.lg, marginBottom: 0 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  searchWrap: { flex: 1 },
  filterBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  filterBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterPanel: {
    backgroundColor: colors.elevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong,
    padding: spacing.lg, gap: spacing.md,
  },
  filterSection: { gap: spacing.sm },
  filterLabel: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  segRow: { flexDirection: 'row', gap: spacing.sm },
  seg: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderRadius: radius.sm - 2, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  segActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  segText: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.textMuted },
  segTextActive: { color: '#000' },

  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minHeight: 72, marginBottom: spacing.sm,
  },
  roomInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roomName: { flexShrink: 1, fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },
  roomTopic: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  roomOwner: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
  roomMeta: { alignItems: 'flex-end', gap: 2 },
  roomTime: { fontSize: fontSize.caption, color: colors.textMuted },
  memberCount: { fontSize: fontSize.caption, color: colors.textMuted },

  createCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderStyle: 'dashed', borderColor: colors.borderStrong,
  },
  createIcon: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(232,168,64,0.2)',
  },
  createIconText: { fontSize: 20, color: colors.accent },
  createTitle: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.accent },
  createSub: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },

  // Code modal
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl,
    zIndex: 100,
  },
  modalCard: {
    backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl,
    width: '100%', maxWidth: 340, gap: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.text },
  modalSub: { fontSize: fontSize.small, color: colors.textSecondary },
  modalCancel: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalCancelText: { color: colors.text, fontSize: fontSize.title, fontWeight: fontWeight.semibold },
  modalJoin: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  modalJoinText: { color: '#000', fontSize: fontSize.title, fontWeight: fontWeight.semibold },
});

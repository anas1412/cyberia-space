import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { card, sectionLabel } from '../lib/sharedStyles';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import DiceBearAvatar from '../components/DiceBearAvatar';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';

export default function RoomsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const rooms = useQuery(api.rooms.listPublic);
  const [query, setQuery] = useState('');

  if (rooms === undefined) return <SafeAreaView style={s.container} edges={['top']}><Header title="Rooms" /><Loading /></SafeAreaView>;

  const filtered = query.trim()
    ? rooms.filter((r: any) => r.name.toLowerCase().includes(query.toLowerCase()) || r.topic?.toLowerCase().includes(query.toLowerCase()))
    : rooms;

  const myRoom = filtered.find((r: any) => r.ownerHandle === user?.handle);
  const otherRooms = filtered.filter((r: any) => r.ownerHandle !== user?.handle);
  const sorted = myRoom ? [myRoom, ...otherRooms] : otherRooms;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header
        title="Rooms"
        rightLabel={user?.privateRoomId ? undefined : 'New'}
        onRightPress={() => navigation.navigate('NewRoom')}
      />

      <FlatList
        data={sorted}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.listHead}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search rooms…" />
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
            {!query.trim() && myRoom && <Text style={[sectionLabel, { marginBottom: spacing.sm }]}>My Room</Text>}
          </View>
        }
        renderItem={({ item, index }: any) => {
          const isMine = item.ownerHandle === user?.handle;
          const showAllLabel = !query.trim() && index === (myRoom ? 1 : 0);
          return (
            <View key={item._id}>
              {showAllLabel && <Text style={[sectionLabel, { marginTop: spacing.md, marginBottom: spacing.sm }]}>All Rooms</Text>}
            <TouchableOpacity style={[card, s.roomCard]}
              onPress={() => navigation.navigate('Room', { roomId: item._id, name: item.name })}
              activeOpacity={0.8}>
              <DiceBearAvatar seed={item.name} style="glass" size={40} bgColor={item.ownerColor} />
              <View style={s.roomInfo}>
                <View style={s.nameRow}>
                  <Text style={s.roomName}>{item.name}</Text>
                  {isMine && <Star size={12} color={colors.accent} strokeWidth={2.5} fill={colors.accent} />}
                </View>
                {item.topic ? <Text style={s.roomTopic} numberOfLines={1}>{item.topic}</Text> : null}
                <Text style={s.roomOwner}>by @{item.ownerHandle}</Text>
              </View>
              <View style={s.roomMeta}>
                {item.memberCount > 0 && <Text style={s.memberCount}>{item.memberCount} online</Text>}
              </View>
            </TouchableOpacity>
            </View>
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
              title={user?.privateRoomId ? "No other rooms" : "No rooms yet"}
              subtitle={user?.privateRoomId ? "You already have your own" : "Create the first one"}
              actionLabel={user?.privateRoomId ? undefined : "Create a room"}
              onAction={user?.privateRoomId ? undefined : () => navigation.navigate('NewRoom')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  listHead: { gap: spacing.lg, marginBottom: spacing.sm },

  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  roomInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roomName: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },
  roomTopic: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  roomOwner: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
  roomMeta: {},
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
});

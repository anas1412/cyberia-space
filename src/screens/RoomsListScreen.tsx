import React from 'react';
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

export default function RoomsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const rooms = useQuery(api.rooms.listPublic) ?? [];

  const myRoom = rooms.find((r: any) => r.ownerHandle === user?.handle);
  const otherRooms = rooms.filter((r: any) => r.ownerHandle !== user?.handle);

  // Merge: my room first, then others
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
            {myRoom && <Text style={sectionLabel}>My Room</Text>}
          </View>
        }
        renderItem={({ item, index }: any) => {
          const isMine = item.ownerHandle === user?.handle;
          const showAllLabel = myRoom && index === 1;
          return (
            <View key={item._id}>
              {showAllLabel && <Text style={[sectionLabel, { marginTop: spacing.lg, marginBottom: spacing.md }]}>All Rooms</Text>}
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
          <EmptyState
            title="No rooms yet"
            subtitle="Create the first one"
            actionLabel="Create a room"
            onAction={() => navigation.navigate('NewRoom')}
          />
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
});

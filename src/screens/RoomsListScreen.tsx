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

export default function RoomsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const rooms = useQuery(api.rooms.listPublic) ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="Rooms" rightLabel="New" onRightPress={() => navigation.navigate('NewRoom')} />

      <FlatList
        data={rooms}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.listHead}>
            {user?.privateRoomId ? (
              <TouchableOpacity style={s.privateCard}
                onPress={() => navigation.navigate('Room', { roomId: user.privateRoomId, name: 'My Room' })}
                activeOpacity={0.8}>
                <View style={s.privateLeft}>
                  <View style={s.privateIcon}><Text style={s.privateIconText}>&#9672;</Text></View>
                  <View>
                    <Text style={s.privateTitle}>My Room</Text>
                    <Text style={s.privateSub}>Your permanent space</Text>
                  </View>
                </View>
                <Text style={s.arrow}>&#8594;</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={sectionLabel}>All Rooms</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity style={[card, s.roomCard]}
            onPress={() => navigation.navigate('Room', { roomId: item._id, name: item.name })}
            activeOpacity={0.8}>
            <View style={s.roomIcon}>
              <Text style={s.roomHash}>#</Text>
            </View>
            <View style={s.roomInfo}>
              <Text style={s.roomName}>{item.name}</Text>
              {item.topic ? <Text style={s.roomTopic} numberOfLines={1}>{item.topic}</Text> : null}
            </View>
            <View style={s.roomMeta}>
              {item.memberCount > 0 && <Text style={s.memberCount}>{item.memberCount} online</Text>}
            </View>
          </TouchableOpacity>
        )}
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

  privateCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.accentBg, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(232,168,64,0.2)',
  },
  privateLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  privateIcon: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: 'rgba(232,168,64,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  privateIconText: { fontSize: 20, color: colors.accent },
  privateTitle: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },
  privateSub: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: 18, color: colors.textMuted },

  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  roomIcon: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  roomHash: { fontSize: 18, color: colors.accent, fontWeight: fontWeight.bold },
  roomInfo: { flex: 1 },
  roomName: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },
  roomTopic: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  roomMeta: {},
  memberCount: { fontSize: fontSize.caption, color: colors.textMuted },
});

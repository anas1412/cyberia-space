import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { saveLastRoom } from '../lib/storage';
import { colors, spacing, fontSize, fontWeight } from '../lib/theme';
import Loading from '../components/Loading';
import ContentWrap from '../components/ContentWrap';
import Header from '../components/Header';

export default function InviteScreen({ route, navigation }: any) {
  const { roomId, password: urlPassword } = route.params;
  const { userId, isLoading, loginAsGuest } = useAuth();
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const room = useQuery(api.rooms.get, { roomId });
  const joinAsTemporaryUser = useMutation(api.rooms.joinAsTemporaryUser);

  // Wait for auth to resolve, then create guest if needed, then hand off to RoomScreen
  useEffect(() => {
    if (isLoading) return;

    // Authenticated — go straight to room
    if (userId) {
      navigation.replace('Room', { roomId, password: urlPassword });
      return;
    }

    // Not authenticated — create guest account, then go to room
    if (creatingGuest) return;
    setCreatingGuest(true);
    joinAsTemporaryUser({ roomId, password: urlPassword ?? undefined }).then(async (res: any) => {
      if (res?.error) {
        setError(res.error === 'Password required' ? 'This room requires a password' : res.error);
        setCreatingGuest(false);
        return;
      }
      await loginAsGuest(res.token, res.userId);
      saveLastRoom(roomId, urlPassword);
      navigation.replace('Room', { roomId, password: urlPassword });
    });
  }, [userId, isLoading, roomId]);

  // Loading state
  if (room === undefined || creatingGuest) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Joining…" onBack={() => navigation.goBack()} />
          <Loading />
        </ContentWrap>
      </SafeAreaView>
    );
  }

  // Room not found
  if (room === null) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Not found" onBack={() => navigation.goBack()} />
          <View style={s.centered}>
            <Text style={s.emptyText}>This room doesn't exist anymore</Text>
          </View>
        </ContentWrap>
      </SafeAreaView>
    );
  }

  // Error (e.g. wrong password before guest was created)
  if (error) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ContentWrap variant="chat">
          <Header title="Cannot join" onBack={() => navigation.goBack()} />
          <View style={s.centered}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        </ContentWrap>
      </SafeAreaView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.body, textAlign: 'center' },
  errorText: { color: colors.error, fontSize: fontSize.body, textAlign: 'center' },
});

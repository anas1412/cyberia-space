import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getLastRoom } from '../lib/storage';
import { colors } from '../lib/theme';

export default function BootScreen({ navigation }: any) {
  const { isLoading, isLoggedIn, isGuest } = useAuth();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isGuest) {
        getLastRoom().then(lastRoom => {
          setTimeout(() => {
            if (lastRoom) {
              navigation.replace('Room', { roomId: lastRoom.roomId, password: lastRoom.password });
            } else {
              navigation.replace('Main');
            }
          }, 800);
        });
      } else {
        setTimeout(() => navigation.replace(isLoggedIn ? 'Main' : 'Auth'), 800);
      }
    }
  }, [isLoading, isLoggedIn, isGuest]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.mark, { opacity, transform: [{ scale }] }]}>
        <View style={styles.square1} />
        <View style={styles.square2} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  square1: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.accent,
    top: 0,
    left: 0,
  },
  square2: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.accentLight,
    bottom: 0,
    right: 0,
    opacity: 0.7,
  },
});

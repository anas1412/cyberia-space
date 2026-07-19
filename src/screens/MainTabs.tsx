import React, { useState, useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Hash, MessageCircle, CircleUser } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../lib/responsive';
import { colors, fontSize, fontWeight } from '../lib/theme';
import ResponsiveLayout from '../components/ResponsiveLayout';
import RoomsListScreen from './RoomsListScreen';
import DMListScreen from './DMListScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ Icon, label, focused, badge }: {
  Icon: any; label: string; focused: boolean; badge?: number;
}) {
  return (
    <View style={ts.wrap}>
      <Icon size={22} color={focused ? colors.accent : colors.textMuted} strokeWidth={2} />
      <Text style={[ts.label, focused && ts.labelActive]}>{label}</Text>
      {badge ? (
        <View style={ts.badge}><Text style={ts.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>
      ) : null}
    </View>
  );
}

function DesktopTabs({ dmUnread }: { dmUnread: number }) {
  const [activeTab, setActiveTab] = useState('Rooms');
  const jumpToRef = useRef<((name: string) => void) | null>(null);

  return (
    <ResponsiveLayout
      activeTab={activeTab}
      onTabPress={(name) => jumpToRef.current?.(name)}
      dmUnread={dmUnread}
    >
      <Tab.Navigator
        id="desktop-tabs"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
        tabBar={(props) => {
          jumpToRef.current = (props.navigation as any).jumpTo;
          const route = props.state.routes[props.state.index];
          if (route && route.name !== activeTab) {
            requestAnimationFrame(() => setActiveTab(route.name));
          }
          return null;
        }}
      >
        <Tab.Screen name="Rooms" component={RoomsListScreen} />
        <Tab.Screen name="DMList" component={DMListScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </ResponsiveLayout>
  );
}

export default function MainTabs() {
  const { userId, isGuest, logout } = useAuth();
  const { isDesktop } = useResponsive();
  const navigation = require('@react-navigation/native').useNavigation();
  const dms = useQuery(api.dms.listForUser, userId ? { userId: userId as any } : 'skip');
  const dmUnread = dms ? dms.filter((d: any) => d.unreadCount > 0).length : 0;

  // Guard: guests should not be here
  useEffect(() => {
    if (isGuest) {
      logout();
      navigation.replace('Auth');
    }
  }, [isGuest]);

  if (isDesktop) {
    return <DesktopTabs dmUnread={dmUnread} />;
  }

  return (
    <Tab.Navigator
      id="mobile-tabs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: ts.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Rooms" component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={Hash} label="Rooms" focused={focused} /> }}
      />
      <Tab.Screen name="DMList" component={DMListScreen}
        options={{ tabBarIcon: ({ focused }) => (
          <TabIcon Icon={MessageCircle} label="Messages" focused={focused} badge={dmUnread || undefined} />
        ) }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={CircleUser} label="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

const ts = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 56,
    paddingBottom: 8,
    paddingTop: 8,
  },
  wrap: { alignItems: 'center', gap: 2, position: 'relative' },
  label: { fontSize: fontSize.caption, color: colors.textMuted, fontWeight: fontWeight.medium },
  labelActive: { color: colors.accent },
  badge: {
    position: 'absolute', top: -2, right: -10,
    backgroundColor: colors.accent, borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#000', fontSize: 10, fontWeight: fontWeight.bold },
});

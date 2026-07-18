import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Hash, MessageCircle, CircleUser } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, fontSize, fontWeight } from '../lib/theme';
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

export default function MainTabs() {
  const { userId } = useAuth();
  const dms = useQuery(api.dms.listForUser, userId ? { userId: userId as any } : 'skip');
  const dmUnread = dms ? dms.reduce((sum: number, d: any) => sum + (d.unreadCount || 0), 0) : 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: ts.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Rooms" component={RoomsListScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Hash} label="Rooms" focused={focused} />,
        }}
      />
      <Tab.Screen name="DMList" component={DMListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={MessageCircle} label="Messages" focused={focused} badge={dmUnread || undefined} />
          ),
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={CircleUser} label="Profile" focused={focused} />,
        }}
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

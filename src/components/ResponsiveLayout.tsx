import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Hash, MessageCircle, CircleUser } from 'lucide-react-native';
import { useResponsive } from '../lib/responsive';
import { colors, fontSize, fontWeight } from '../lib/theme';

interface Props {
  children: React.ReactNode;
  activeTab: string;
  onTabPress: (name: string) => void;
  dmUnread: number;
}

export default function ResponsiveLayout({ children, activeTab, onTabPress, dmUnread }: Props) {
  const { isDesktop } = useResponsive();

  if (!isDesktop) return <>{children}</>;

  const tabs = [
    { key: 'Rooms',    Icon: Hash,         label: 'Rooms' },
    { key: 'DMList',   Icon: MessageCircle, label: 'Messages', badge: dmUnread },
    { key: 'Profile',  Icon: CircleUser,    label: 'Profile' },
  ];

  return (
    <View style={s.row}>
      <View style={s.sidebar}>
        {tabs.map(({ key, Icon, label, badge }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => onTabPress(key)}
              activeOpacity={0.7}
            >
              <View style={s.tabInner}>
                <Icon size={22} color={active ? colors.accent : colors.textMuted} strokeWidth={2} />
                <Text style={[s.label, active && s.labelActive]}>{label}</Text>
              </View>
              {badge ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={s.content}>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    backgroundColor: colors.bg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 16,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: fontSize.small,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  labelActive: {
    color: colors.accent,
  },
  badge: {
    marginLeft: 'auto',
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
  },
});

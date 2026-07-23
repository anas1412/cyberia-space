import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Shield } from 'lucide-react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import ContentWrap from '../components/ContentWrap';
import Header from '../components/Header';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../../legal';

type LegalTab = 'privacy' | 'terms';

export default function LegalScreen({ navigation }: any) {
  const [tab, setTab] = React.useState<LegalTab>('privacy');

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ContentWrap>
        <Header title="Legal" onBack={() => navigation.goBack()} />

        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, tab === 'privacy' && s.tabActive]}
            onPress={() => setTab('privacy')}
            activeOpacity={0.7}
          >
            <Shield size={14} color={tab === 'privacy' ? '#000' : colors.textSecondary} strokeWidth={2} />
            <Text style={[s.tabText, tab === 'privacy' && s.tabTextActive]}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === 'terms' && s.tabActive]}
            onPress={() => setTab('terms')}
            activeOpacity={0.7}
          >
            <FileText size={14} color={tab === 'terms' ? '#000' : colors.textSecondary} strokeWidth={2} />
            <Text style={[s.tabText, tab === 'terms' && s.tabTextActive]}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={s.body}>{tab === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE}</Text>
        </ScrollView>
      </ContentWrap>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#000',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  body: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

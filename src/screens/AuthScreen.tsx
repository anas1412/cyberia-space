import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { COUNTRIES } from '../lib/countries';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import ContentWrap from '../components/ContentWrap';
import PhoneInput from '../components/PhoneInput';
import Input from '../components/Input';
import Button from '../components/Button';
import DiceBearAvatar from '../components/DiceBearAvatar';
import ColorPicker from '../components/ColorPicker';
import { useAsyncAction } from '../hooks/useAsyncAction';

type Step = 'phone' | 'otp' | 'handle';

export default function AuthScreen({ route, navigation }: any) {
  const preAuthRoomId = route?.params?.preAuthRoomId;
  const preAuthRoomName = route?.params?.preAuthRoomName;
  const preAuthPassword = route?.params?.preAuthPassword;
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+216');
  const [otp, setOtp] = useState('');
  const [handle, setHandle] = useState('');
  const [color, setColor] = useState('#E8A840');
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [localError, setLocalError] = useState('');

  const bypass = process.env.EXPO_PUBLIC_TWILIO_BYPASS === 'true';
  const otpRef = useRef<any>(null);
  const sendOtp = useAction(api.auth.sendOtp);
  const verifyOtp = useAction(api.auth.verifyOtp);
  const setHandleFn = useMutation(api.auth.setHandle);

  const { execute: doSendOtp, loading: sending, error: sendError } = useAsyncAction(sendOtp);
  const { execute: doVerifyOtp, loading: verifying, error: verifyError, reset: resetVerify } = useAsyncAction(verifyOtp);
  const { execute: doSetHandle, loading: creating, error: handleError } = useAsyncAction(setHandleFn);

  async function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 8) { setLocalError('Enter a valid phone number.'); return; }
    setLocalError('');
    const res = await doSendOtp({ phone: cleaned, bypass });
    if (!res) return;
    if (res.code) setSentCode(res.code);
    setStep('otp');
  }

  async function handleVerify() {
    const res = await doVerifyOtp({ phone: phone.replace(/\s/g, ''), code: otp, platform: 'mobile', bypass });
    if (!res) return;
    setUserId(res.userId as string); setToken(res.token as string);
    if (res.isNewUser) setStep('handle');
    else {
      await login(res.token as string, res.userId as string);
      if (preAuthRoomId) {
        navigation.replace('Room', { roomId: preAuthRoomId, password: preAuthPassword ?? '' });
      } else {
        navigation.replace('Main');
      }
    }
  }

  async function handleSetHandle() {
    const res = await doSetHandle({ userId: userId as any, handle, avatarColor: color });
    if (!res) return;
    await login(token, userId);
    if (preAuthRoomId) {
      navigation.replace('Room', { roomId: preAuthRoomId, password: preAuthPassword ?? '' });
    } else {
      navigation.replace('Main');
    }
  }

  const steps: Step[] = ['phone', 'otp', 'handle'];
  const currentIdx = steps.indexOf(step);

  return (
    <SafeAreaView style={s.container}>
      <ContentWrap variant="auth">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.content}>
          {step === 'phone' ? (
            <View style={s.brand}>
              <Svg width={44} height={44} viewBox="0 0 64 64">
                <Rect x="0" y="0" width="40" height="40" rx="10" fill="#E8A840"/>
                <Rect x="24" y="24" width="40" height="40" rx="10" fill="#F0C060" opacity="0.7"/>
              </Svg>
              <Text style={s.brandTitle}>Cyberia Space</Text>
              <View style={s.tagline}>
                <Text style={s.taglineHead}>Present or not.</Text>
                <Text style={s.taglineBody}>
                  Messages disappear when you leave the room.{'\n'}
                  Direct messages fade after 24 hours.
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.header}>
              <Text style={s.title}>
                {step === 'otp' ? 'Enter the code' : 'Choose your name'}
              </Text>
              <Text style={s.subtitle}>
                {step === 'otp'
                  ? `Sent to ${COUNTRIES.find(c => phone.startsWith(c.dial))?.flag ?? ''} ${phone}`
                  : 'And pick a color to represent you'}
              </Text>
            </View>
          )}

          <View style={s.steps}>
            {steps.map((st, i) => (
              <View key={st} style={[s.stepDot, i === currentIdx && s.stepDotActive, i < currentIdx && s.stepDotDone]} />
            ))}
          </View>

          {step === 'phone' && (
            <View style={s.form}>
              <PhoneInput value={phone} onChangeText={setPhone} onSubmitEditing={handleSendOtp} />
              {sendError || localError ? <Text style={s.error}>{sendError || localError}</Text> : null}
              <Button label="Send code" onPress={handleSendOtp} loading={sending} loadingLabel="Sending…" />
            </View>
          )}

          {step === 'otp' && (
            <View style={s.form}>
              {bypass && sentCode ? (
                <View style={s.bypassBox}>
                  <Text style={s.bypassLabel}>Your code</Text>
                  <Text style={s.bypassCode}>{sentCode}</Text>
                </View>
              ) : null}
              <View style={{ position: 'relative', height: 56 }}>
                <Pressable style={s.otpRow} onPress={() => otpRef.current?.focus()}>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={[s.otpBox, otp[i] && s.otpBoxFilled]}>
                      <Text style={s.otpDigit}>{otp[i] || ''}</Text>
                    </View>
                  ))}
                </Pressable>
                <Input ref={otpRef} value={otp} onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad" autoFocus maxLength={6} caretHidden
                  onSubmitEditing={() => otp.length === 6 && handleVerify()}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }} />
              </View>
              {verifyError ? <Text style={s.error}>{verifyError}</Text> : null}
              <Button label="Continue" onPress={handleVerify} loading={verifying} loadingLabel="Verifying…" disabled={otp.length !== 6} />
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); resetVerify(); }} style={s.link}>
                <Text style={s.linkText}>Use a different number</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'handle' && (
            <View style={s.form}>
              <Input value={handle} onChangeText={setHandle}
                placeholder="Your display name" autoFocus maxLength={20} autoCapitalize="none"
                onSubmitEditing={() => handle.length >= 2 && handleSetHandle()} />
              <ColorPicker value={color} onChange={setColor} />
              {handle.length > 0 && (
                <View style={s.preview}>
                  <DiceBearAvatar seed={handle || 'user'} style="croodles-neutral" size={40} bgColor={color} />
                  <Text style={s.previewHandle}>@{handle}</Text>
                </View>
              )}
              {handleError ? <Text style={s.error}>{handleError}</Text> : null}
              <Button label="Create account" onPress={handleSetHandle} loading={creating} loadingLabel="Creating…" disabled={handle.length < 2} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      </ContentWrap>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.xxl, justifyContent: 'center', gap: spacing.xxl },
  header: { gap: spacing.sm },

  brand: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  brandTitle: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    textAlign: 'center',
  },
  tagline: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  taglineHead: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  taglineBody: {
    fontSize: fontSize.small,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  title: { fontSize: fontSize.hero, fontWeight: fontWeight.bold, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: fontSize.body, color: colors.textSecondary, lineHeight: 22 },
  steps: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong },
  stepDotActive: { backgroundColor: colors.accent, width: 20 },
  stepDotDone: { backgroundColor: colors.accentLight },

  form: { gap: spacing.lg },
  otpRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  otpBox: {
    width: 44, height: 56, borderRadius: radius.sm, backgroundColor: colors.elevated,
    borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxFilled: { borderColor: colors.accent },
  otpDigit: { fontSize: fontSize.header, fontWeight: fontWeight.bold, color: colors.text },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.elevated, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  previewHandle: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text },

  link: { alignItems: 'center', padding: spacing.sm },
  linkText: { color: colors.textSecondary, fontSize: fontSize.body },
  error: { color: colors.error, fontSize: fontSize.small, textAlign: 'center' },
  bypassBox: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  bypassLabel: { fontSize: fontSize.small, color: colors.textSecondary, marginBottom: 4 },
  bypassCode: { fontSize: 28, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 6 },
});

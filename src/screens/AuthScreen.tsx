import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import Input from '../components/Input';
import Button from '../components/Button';
import DiceBearAvatar from '../components/DiceBearAvatar';
import ColorPicker from '../components/ColorPicker';

type Step = 'phone' | 'otp' | 'handle';

export default function AuthScreen({ navigation }: any) {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [handle, setHandle] = useState('');
  const [color, setColor] = useState('#E8A840');
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = useMutation(api.auth.sendOtp);
  const verifyOtp = useMutation(api.auth.verifyOtp);
  const setHandleFn = useMutation(api.auth.setHandle);

  async function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned.startsWith('+')) { setError('Include your country code, e.g. +1'); return; }
    setLoading(true); setError('');
    try { await sendOtp({ phone: cleaned }); setStep('otp'); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleVerify() {
    setLoading(true); setError('');
    try {
      const res = await verifyOtp({ phone: phone.replace(/\s/g, ''), code: otp, platform: 'mobile' });
      if (!res.success) { setError(res.error ?? 'Invalid code'); setLoading(false); return; }
      setUserId(res.userId); setToken(res.token);
      if (res.isNewUser) setStep('handle');
      else { await login(res.token, res.userId); navigation.replace('Main'); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleSetHandle() {
    setLoading(true); setError('');
    try {
      const res = await setHandleFn({ userId: userId as any, handle, avatarColor: color });
      if ('error' in res && res.error) { setError(res.error); setLoading(false); return; }
      await login(token, userId);
      navigation.replace('Main');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  const steps: Step[] = ['phone', 'otp', 'handle'];
  const currentIdx = steps.indexOf(step);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.content}>
          <View style={s.header}>
            <Text style={s.title}>
              {step === 'phone' ? "What's your number?" : step === 'otp' ? 'Enter the code' : 'Choose your name'}
            </Text>
            <Text style={s.subtitle}>
              {step === 'phone'
                ? 'We\'ll send you a verification code'
                : step === 'otp'
                  ? `Sent to ${phone}`
                  : 'And pick a color to represent you'}
            </Text>
          </View>

          <View style={s.steps}>
            {steps.map((st, i) => (
              <View key={st} style={[s.stepDot, i === currentIdx && s.stepDotActive, i < currentIdx && s.stepDotDone]} />
            ))}
          </View>

          {step === 'phone' && (
            <View style={s.form}>
              <Input value={phone} onChangeText={setPhone}
                placeholder="+1 555 000 0000" keyboardType="phone-pad" autoFocus
                returnKeyType="done" onSubmitEditing={handleSendOtp} />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Button label="Send code" onPress={handleSendOtp} loading={loading} loadingLabel="Sending…" />
            </View>
          )}

          {step === 'otp' && (
            <View style={s.form}>
              <View style={{ position: 'relative', height: 56 }}>
                <View style={s.otpRow}>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={[s.otpBox, otp[i] && s.otpBoxFilled]}>
                      <Text style={s.otpDigit}>{otp[i] || ''}</Text>
                    </View>
                  ))}
                </View>
                <Input value={otp} onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad" autoFocus maxLength={6} caretHidden
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }} />
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Button label="Continue" onPress={handleVerify} loading={loading} loadingLabel="Verifying…" disabled={otp.length !== 6} />
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setError(''); }} style={s.link}>
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
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Button label="Create account" onPress={handleSetHandle} loading={loading} loadingLabel="Creating…" disabled={handle.length < 2} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.xxl, justifyContent: 'center', gap: spacing.xxl },
  header: { gap: spacing.sm },
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
});

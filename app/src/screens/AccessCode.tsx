import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LockedFeed, deriveAccess, isListed, normalize, saveAccess } from '../access';
import { FEED_URL, SCHOOL_NAME } from '../config';
import { useTheme } from '../theme';

/** Shown until this phone has a working access code. */
export default function AccessCode({ revoked, onUnlocked }: { revoked: boolean; onUnlocked: () => void }) {
  const t = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(revoked ? 'The access code on this phone no longer works. Ask for a new one.' : null);

  const unlock = async () => {
    if (normalize(code).length < 10) { setError('Codes look like K7QM-29XP-FT4W. Check it and try again.'); return; }
    setBusy(true);
    setError(null);
    try {
      const a = await deriveAccess(code);
      const r = await fetch(`${FEED_URL}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!r.ok) throw new Error('offline');
      if (!isListed((await r.json()) as LockedFeed, a)) {
        setError("That code doesn't work. Check it with the person who gave it to you.");
        return;
      }
      await saveAccess(a);
      onUnlocked();
    } catch {
      setError("Couldn't reach the calendar. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: t.text, fontSize: 30, fontWeight: '800' }}>Events</Text>
      <Text style={{ color: t.sub, fontSize: 15, marginTop: 4 }}>{SCHOOL_NAME}</Text>
      <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', marginTop: 32 }}>Enter your access code</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 6 }}>This calendar is private. You only need to enter your code once.</Text>
      <TextInput
        value={code}
        onChangeText={(s) => { setCode(s); setError(null); }}
        placeholder="XXXX-XXXX-XXXX"
        placeholderTextColor={t.sub}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="go"
        onSubmitEditing={unlock}
        editable={!busy}
        style={[st.input, { color: t.text, backgroundColor: t.card, borderColor: t.line }]}
      />
      {error ? <Text style={{ color: t.email, fontSize: 14, marginTop: 10 }}>{error}</Text> : null}
      <Pressable onPress={unlock} disabled={busy} style={[st.btn, { backgroundColor: t.accent, opacity: busy ? 0.6 : 1 }]}>
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>Unlock</Text>}
      </Pressable>
      <View style={{ height: 80 }} />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  input: { marginTop: 16, fontSize: 22, fontWeight: '700', letterSpacing: 2, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, textAlign: 'center' },
  btn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});

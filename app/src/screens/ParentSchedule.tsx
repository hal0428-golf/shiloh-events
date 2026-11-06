import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getEditKey, setEditKey } from '../edits';
import { PARENT_COLORS, ParentPlan, dayKeyOf, getPlan, loadPlan, savePlan, textOn } from '../parents';
import { useTheme } from '../theme';

const TODAY = '#0a2f7a'; // today's square: dark blue
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Settings › Parenting schedule: two parents, their colors, and who has the kids each day. */
export default function ParentSchedule({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const now = new Date();
  const [plan, setPlan] = useState<ParentPlan>(getPlan);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [key, setKey] = useState('');
  const [cursor, setCursor] = useState(now.getFullYear() * 12 + now.getMonth());

  useEffect(() => {
    getEditKey().then((k) => setHasKey(!!k));
    loadPlan().then((p) => { if (!dirty) setPlan(p); });
  }, []);

  const change = (p: ParentPlan) => { setPlan(p); setDirty(true); };
  const setParent = (i: 0 | 1, part: Partial<ParentPlan['parents'][0]>) => {
    const parents = [...plan.parents] as ParentPlan['parents'];
    parents[i] = { ...parents[i], ...part };
    change({ ...plan, parents });
  };
  const tapDay = (k: string) => {
    if (!hasKey) return;
    const days = { ...plan.days };
    const cur = days[k];
    if (cur === undefined) days[k] = 0;
    else if (cur === 0) days[k] = 1;
    else delete days[k];
    change({ ...plan, days });
  };

  const year = Math.floor(cursor / 12);
  const month = cursor % 12;
  const offset = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const counts = useMemo(() => {
    const c = [0, 0];
    for (let d = 1; d <= daysIn; d++) {
      const who = plan.days[dayKeyOf(new Date(year, month, d))];
      if (who !== undefined) c[who]++;
    }
    return c;
  }, [plan, year, month, daysIn]);

  const clearMonth = () => {
    const days = { ...plan.days };
    for (let d = 1; d <= daysIn; d++) delete days[dayKeyOf(new Date(year, month, d))];
    change({ ...plan, days });
  };
  const save = async () => {
    setBusy(true);
    try {
      await savePlan(plan);
      setDirty(false);
      Alert.alert('Saved', 'Everyone with a code will see the new schedule within a few minutes.');
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const saveKey = async () => {
    if (!key.trim()) return;
    await setEditKey(key);
    setKey('');
    setHasKey(true);
  };
  const back = () => {
    if (!dirty) return onBack();
    Alert.alert('Discard changes?', 'Your schedule changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onBack },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={back} style={{ flex: 1 }}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Settings</Text></Pressable>
        {hasKey ? (
          <Pressable onPress={save} disabled={!dirty || busy} style={[st.save, { backgroundColor: dirty ? t.hol : t.chip }]}>
            {busy ? <ActivityIndicator color={t.holText} /> : <Text style={{ color: dirty ? t.holText : t.sub, fontWeight: '700' }}>{dirty ? 'Save' : 'Saved'}</Text>}
          </Pressable>
        ) : null}
      </View>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginTop: 12 }}>Parenting schedule</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 4 }}>
        Who has the kids each day. These days show first on the calendar in each parent's color, and replace parent days from emails.
      </Text>

      {hasKey === false ? (
        <View style={[st.box, { backgroundColor: t.card, borderColor: t.line }]}>
          <Text style={{ color: t.text, fontSize: 15 }}>Changing the schedule needs the editing key. Paste it once:</Text>
          <TextInput value={key} onChangeText={setKey} placeholder="github_pat_…" placeholderTextColor={t.sub} autoCapitalize="none" autoCorrect={false} secureTextEntry
            style={[st.input, { color: t.text, borderColor: t.line }]} />
          <Pressable onPress={saveKey} style={[st.btn, { backgroundColor: t.accent }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Save key</Text></Pressable>
        </View>
      ) : null}

      <Text style={[st.h2, { color: t.text }]}>Days</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 4 }}>{hasKey ? `Tap a day to switch: ${plan.parents[0].name || 'Parent 1'} › ${plan.parents[1].name || 'Parent 2'} › nobody.` : 'Only the person with the editing key can change days.'}</Text>
      <View style={[st.box, { backgroundColor: t.card, borderColor: t.line, padding: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Pressable onPress={() => setCursor(cursor - 1)} hitSlop={10}><Text style={[st.arrow, { color: t.accent }]}>‹</Text></Pressable>
          <Text style={{ flex: 1, textAlign: 'center', color: t.text, fontSize: 17, fontWeight: '700' }}>{MONTHS[month]} {year}</Text>
          <Pressable onPress={() => setCursor(cursor + 1)} hitSlop={10}><Text style={[st.arrow, { color: t.accent }]}>›</Text></Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((w, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: t.sub, fontSize: 12, fontWeight: '700' }}>{w}</Text>)}
        </View>
        {Array.from({ length: Math.ceil((offset + daysIn) / 7) }, (_, w) => (
          <View key={w} style={{ flexDirection: 'row' }}>
            {Array.from({ length: 7 }, (_, c) => {
              const n = w * 7 + c - offset + 1;
              if (n < 1 || n > daysIn) return <View key={c} style={st.cell} />;
              const k = dayKeyOf(new Date(year, month, n));
              const who = plan.days[k];
              const p = who === undefined ? null : plan.parents[who];
              const isToday = k === dayKeyOf(now);
              return (
                <Pressable key={c} onPress={() => tapDay(k)} style={st.cell}>
                  <View style={[st.day, { backgroundColor: isToday ? TODAY : p ? p.color : t.chip, borderColor: isToday && p ? p.color : 'transparent' }]}>
                    <Text style={{ color: isToday ? '#ffffff' : p ? textOn(p.color) : t.text, fontSize: 15, fontWeight: '700' }}>{n}</Text>
                    <Text numberOfLines={1} style={{ color: isToday ? (p ? p.color : '#ffffff') : p ? textOn(p.color) : t.sub, fontSize: 9, fontWeight: '700' }}>{p ? p.name || `P${(who ?? 0) + 1}` : ' '}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
          {([0, 1] as const).map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[st.dot, { backgroundColor: plan.parents[i].color, width: 10, height: 10 }]} />
              <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>{plan.parents[i].name || `Parent ${i + 1}`}: {counts[i]} days</Text>
            </View>
          ))}
        </View>
        {hasKey ? (
          <Pressable onPress={clearMonth} style={{ alignSelf: 'center', marginTop: 8 }}><Text style={{ color: t.email, fontSize: 13, fontWeight: '600' }}>Clear this month</Text></Pressable>
        ) : null}
      </View>

      <Text style={[st.h2, { color: t.text }]}>Child</Text>
      <View style={[st.box, { backgroundColor: t.card, borderColor: t.line }]}>
        <Text style={{ color: t.sub, fontSize: 13, fontWeight: '700' }}>CHILD'S NAME</Text>
        <TextInput value={plan.child ?? ''} onChangeText={(child) => change({ ...plan, child })} editable={!!hasKey} placeholder="Name" placeholderTextColor={t.sub}
          autoCapitalize="words" returnKeyType="done" style={[st.field, { color: t.text, borderColor: t.line, backgroundColor: t.bg, marginTop: 6 }]} />
      </View>

      <Text style={[st.h2, { color: t.text }]}>Parents</Text>
      {([0, 1] as const).map((i) => (
        <View key={i} style={[st.box, { backgroundColor: t.card, borderColor: t.line }]}>
          <Text style={{ color: t.sub, fontSize: 13, fontWeight: '700' }}>PARENT {i + 1} NAME</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <View style={[st.dot, { backgroundColor: plan.parents[i].color }]} />
            <TextInput value={plan.parents[i].name} onChangeText={(name) => setParent(i, { name })} editable={!!hasKey} placeholder={`Parent ${i + 1}`} placeholderTextColor={t.sub}
              autoCapitalize="words" returnKeyType="done" style={[st.field, { color: t.text, borderColor: t.line, backgroundColor: t.bg }]} />
          </View>
          <Text style={{ color: t.sub, fontSize: 13, fontWeight: '700', marginTop: 12 }}>COLOR</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            {PARENT_COLORS.map((c) => (
              <Pressable key={c} disabled={!hasKey} onPress={() => setParent(i, { color: c })}
                style={[st.swatch, { backgroundColor: c, borderColor: plan.parents[i].color === c ? t.text : 'transparent' }]} />
            ))}
          </View>
        </View>
      ))}

      {hasKey ? <Text style={{ color: t.sub, fontSize: 13, marginTop: 10 }}>Changes are only shared after you tap Save at the top.</Text> : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: '800', marginTop: 24 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  box: { marginTop: 10, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, aspectRatio: 1, padding: 2 },
  day: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  arrow: { fontSize: 30, fontWeight: '600', paddingHorizontal: 10, lineHeight: 34 },
  field: { flex: 1, fontSize: 17, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  input: { marginTop: 8, fontSize: 15, padding: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  btn: { marginTop: 10, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  save: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16, minWidth: 70, alignItems: 'center' },
});

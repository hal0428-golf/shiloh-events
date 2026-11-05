import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GRADES, Grade, getMyGrades, gradeName, gradeShort, saveMyGrades } from '../lib';
import { FamilyCal, getFamilyCal, listPhoneCalendars, setFamilyCal } from '../familyCal';
import { useTheme } from '../theme';

export default function Settings({ onBack, onSetup, onChangeCode }: { onBack: () => void; onSetup: () => void; onChangeCode: () => void }) {
  const t = useTheme();
  const [grades, setGrades] = useState<Grade[]>(getMyGrades);
  const toggle = (g: Grade) => {
    const next = grades.includes(g) ? grades.filter((x) => x !== g) : [...grades, g];
    if (!next.length) return; // keep at least one grade
    setGrades(next);
    saveMyGrades(next);
  };
  const [fam, setFam] = useState<FamilyCal | null>(null);
  const [cals, setCals] = useState<{ id: string; title: string; source: string; color: string }[] | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => { getFamilyCal().then(setFam); }, []);
  const pickCal = async () => {
    const list = await listPhoneCalendars().catch(() => null);
    setDenied(!list);
    setCals(list);
  };
  const choose = (c: FamilyCal | null) => { setFam(c); setFamilyCal(c); setCals(null); };
  const chosen = GRADES.filter((g) => grades.includes(g)).map(gradeName).join(', ');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Pressable onPress={onBack}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Events</Text></Pressable>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginTop: 12 }}>Settings</Text>

      <Text style={[st.h2, { color: t.text }]}>Grades</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 4 }}>
        Events for these grades are shown in yellow and under My Grade. Events just for other grades are hidden. Tap to choose one or more.
      </Text>
      <View style={st.grid}>
        {GRADES.map((g) => {
          const on = grades.includes(g);
          return (
            <Pressable key={g} onPress={() => toggle(g)} accessibilityLabel={gradeName(g)} accessibilityState={{ selected: on }}
              style={[st.grade, { backgroundColor: on ? t.elem : t.chip, borderColor: on ? t.elem : t.line }]}>
              <Text style={{ color: on ? '#000000' : t.text, fontSize: 15, fontWeight: '700' }}>{gradeShort(g)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: t.sub, fontSize: 13, marginTop: 8 }}>Selected: {chosen}</Text>

      <Text style={[st.h2, { color: t.text }]}>Co-parent calendar</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 4 }}>
        Show events from a calendar on this iPhone, like Duet, in purple. They stay on your phone.
      </Text>
      <Pressable onPress={pickCal} style={[st.row, { backgroundColor: t.card, borderColor: t.line }]}>
        {fam ? <View style={[st.dot, { backgroundColor: t.family }]} /> : null}
        <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>{fam ? fam.title : 'Choose a calendar'}</Text>
        <Text style={{ color: t.sub, fontSize: 18 }}>›</Text>
      </Pressable>
      {denied ? (
        <Text style={{ color: t.email, fontSize: 13, marginTop: 8 }}>
          Calendar access is off. Turn it on in the iPhone Settings app under Shiloh Events › Calendars (while testing in Expo Go, it's under Expo Go › Calendars).
        </Text>
      ) : null}
      {cals ? (
        <View style={[st.list, { backgroundColor: t.card, borderColor: t.line }]}>
          {cals.map((c) => (
            <Pressable key={c.id} onPress={() => choose({ id: c.id, title: c.title })} style={[st.item, { borderColor: t.line }]}>
              <View style={[st.dot, { backgroundColor: c.color }]} />
              <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>{c.title}{c.source ? <Text style={{ color: t.sub, fontSize: 13 }}>{`  ${c.source}`}</Text> : null}</Text>
              {fam?.id === c.id ? <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>✓</Text> : null}
            </Pressable>
          ))}
          <Pressable onPress={() => choose(null)} style={st.item}>
            <Text style={{ color: t.sub, fontSize: 16, flex: 1 }}>None</Text>
            {!fam ? <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>✓</Text> : null}
          </Pressable>
        </View>
      ) : null}

      <Text style={[st.h2, { color: t.text }]}>Access code</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 4 }}>This phone is unlocked. Only people with a code can see the calendar.</Text>
      <Pressable onPress={onChangeCode} style={[st.row, { backgroundColor: t.card, borderColor: t.line }]}>
        <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>Use a different code</Text>
        <Text style={{ color: t.sub, fontSize: 18 }}>›</Text>
      </Pressable>

      <Text style={[st.h2, { color: t.text }]}>Email events</Text>
      <Pressable onPress={onSetup} style={[st.row, { backgroundColor: t.card, borderColor: t.line }]}>
        <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>Connect your email</Text>
        <Text style={{ color: t.sub, fontSize: 18 }}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: '800', marginTop: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  grade: { minWidth: 56, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  list: { marginTop: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});

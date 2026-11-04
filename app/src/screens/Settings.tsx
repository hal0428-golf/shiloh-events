import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GRADES, Grade, getMyGrades, gradeName, gradeShort, saveMyGrades } from '../lib';
import { useTheme } from '../theme';

export default function Settings({ onBack, onSetup }: { onBack: () => void; onSetup: () => void }) {
  const t = useTheme();
  const [grades, setGrades] = useState<Grade[]>(getMyGrades);
  const toggle = (g: Grade) => {
    const next = grades.includes(g) ? grades.filter((x) => x !== g) : [...grades, g];
    if (!next.length) return; // keep at least one grade
    setGrades(next);
    saveMyGrades(next);
  };
  const chosen = GRADES.filter((g) => grades.includes(g)).map(gradeName).join(', ');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Pressable onPress={onBack}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Events</Text></Pressable>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginTop: 12 }}>Settings</Text>

      <Text style={[st.h2, { color: t.text }]}>Grades</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 4 }}>
        Events for these grades are shown in yellow and under Grade Selected. Events just for other grades are hidden. Tap to choose one or more.
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
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});

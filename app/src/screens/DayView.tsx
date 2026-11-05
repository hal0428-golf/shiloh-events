import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { EventItem, myGradeLabel, formatTime, kindOf } from '../lib';
import { kindStyle, useTheme } from '../theme';

export default function DayView({ events, onOpen }: { events: EventItem[]; onOpen: (e: EventItem) => void }) {
  const t = useTheme();
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}>
      {events.length === 0 && <Text style={{ color: t.sub, textAlign: 'center', marginTop: 48 }}>No events this day.</Text>}
      {events.map((e, i) => {
        const kind = kindOf(e);
        const k = kindStyle(t, kind);
        return (
          <Pressable
            key={e.id + i}
            onPress={() => onOpen(e)}
            style={[s.card, { backgroundColor: t.card, borderColor: t.line, borderLeftColor: k.edge, borderLeftWidth: kind === 'other' ? StyleSheet.hairlineWidth : 5 }]}>
            <Text style={{ color: t.sub, fontSize: 12, fontWeight: '600' }}>
              {formatTime(e)}{kind === 'elem' ? `  ·  ${myGradeLabel(e)}` : kind === 'holiday' ? '  ·  Holiday' : ''}{e.category === 'Parent' ? '  ·  Parent schedule' : e.source === 'email' ? '  ·  from email' : e.source === 'calendar' ? `  ·  ${e.category}` : ''}
            </Text>
            <Text style={[{ color: t.text, fontSize: 16, fontWeight: '600', marginTop: 2 }, kind !== 'other' && { color: k.fg, backgroundColor: k.bg, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, overflow: 'hidden' }]}>{e.title}</Text>
            {e.location ? <Text style={{ color: t.sub, fontSize: 13, marginTop: 2 }}>{e.location}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});

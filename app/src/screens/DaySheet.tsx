import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventItem, formatTime, kindOf, parseDay } from '../lib';
import { kindStyle, useTheme } from '../theme';

export default function DaySheet({
  dayKey, events, onClose, onOpen,
}: { dayKey: string | null; events: EventItem[]; onClose: () => void; onOpen: (e: EventItem) => void }) {
  const t = useTheme();
  return (
    <Modal visible={dayKey !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={[st.sheet, { backgroundColor: t.bg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ flex: 1, color: t.text, fontSize: 18, fontWeight: '800' }}>
            {dayKey ? parseDay(dayKey).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
          </Text>
          <Pressable onPress={onClose}><Text style={{ color: t.accent, fontWeight: '700', fontSize: 16 }}>Done</Text></Pressable>
        </View>
        <ScrollView>
          {events.length === 0 && <Text style={{ color: t.sub, paddingVertical: 16 }}>No events.</Text>}
          {events.map((e, i) => {
            const kind = kindOf(e);
            const k = kindStyle(t, kind);
            return (
              <Pressable
                key={e.id + i}
                onPress={() => { onClose(); onOpen(e); }}
                style={[st.card, { backgroundColor: t.card, borderColor: t.line, borderLeftColor: k.edge, borderLeftWidth: kind === 'other' ? StyleSheet.hairlineWidth : 5 }]}>
                <Text style={{ color: t.sub, fontSize: 12, fontWeight: '600' }}>{formatTime(e)}{kind === 'elem' ? '  ·  5th grade' : kind === 'holiday' ? '  ·  Holiday' : ''}</Text>
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginTop: 2 }}>{e.title}</Text>
                {e.location ? <Text style={{ color: t.sub, fontSize: 13, marginTop: 2 }}>{e.location}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
const st = StyleSheet.create({
  sheet: { maxHeight: '70%', padding: 16, paddingBottom: 32, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  card: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
});

import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventItem, endDate, formatTime, startDate } from '../lib';
import { useTheme } from '../theme';

export default function EventDetail({ event, onBack }: { event: EventItem; onBack: () => void }) {
  const t = useTheme();
  const s0 = startDate(event);
  const e0 = endDate(event);
  const fmt = (d: Date) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const date = event.allDay && e0.toDateString() !== s0.toDateString() ? `${fmt(s0)} – ${fmt(e0)}` : fmt(s0);
  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: t.sub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 16, marginTop: 2 }}>{value}</Text>
    </View>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }}>
      <Pressable onPress={onBack}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Events</Text></Pressable>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginTop: 12 }}>{event.title}</Text>
      <Row label="Date" value={date} />
      <Row label="Time" value={formatTime(event)} />
      {event.category ? <Row label="Calendar" value={event.category} /> : null}
      {event.location ? (
        <View>
          <Row label="Location" value={event.location} />
          <Pressable onPress={() => Linking.openURL('http://maps.apple.com/?q=' + encodeURIComponent(event.location!))} style={[st.btn, { backgroundColor: t.chip }]}>
            <Text style={{ color: t.accent, fontWeight: '600' }}>Open in Maps</Text>
          </Pressable>
        </View>
      ) : null}
      {event.description ? <Row label="Details" value={event.description} /> : null}
      <Text style={{ color: t.sub, fontSize: 12, marginTop: 24 }}>
        {event.source === 'email' ? 'Found in a Shiloh email.' : 'From the Shiloh website calendar.'}
      </Text>
    </ScrollView>
  );
}
const st = StyleSheet.create({ btn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 } });

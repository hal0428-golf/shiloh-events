import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { EventItem, formatTime, groupByDay, loadEvents } from '../lib';
import { useTheme } from '../theme';
import { SCHOOL_NAME } from '../config';

export default function EventList({ onOpen, onSetup }: { onOpen: (e: EventItem) => void; onSetup: () => void }) {
  const t = useTheme();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cat, setCat] = useState<string>('All');

  const load = useCallback(async () => {
    const r = await loadEvents();
    setEvents(r.events);
    setNote(
      r.isSeed ? 'Showing sample events. The live feed is not connected yet.'
      : r.offline ? 'Offline – showing saved events.'
      : r.updated ? 'Updated ' + new Date(r.updated).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : null,
    );
  }, []);
  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => ['All', ...Array.from(new Set((events ?? []).map((e) => e.category ?? 'Other'))).sort()], [events]);
  const sections = useMemo(
    () => groupByDay((events ?? []).filter((e) => cat === 'All' || (e.category ?? 'Other') === cat)),
    [events, cat],
  );

  if (!events) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.h1, { color: t.text }]}>Events</Text>
          <Text style={{ color: t.sub, fontSize: 13 }}>{SCHOOL_NAME}</Text>
        </View>
        <Pressable onPress={onSetup} style={[s.btn, { backgroundColor: t.chip }]}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>Connect email</Text>
        </Pressable>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {cats.map((c) => (
            <Pressable key={c} onPress={() => setCat(c)} style={[s.chip, { backgroundColor: c === cat ? t.accent : t.chip }]}>
              <Text style={{ color: c === cat ? (t.bg === '#0d1117' ? '#0d1117' : '#fff') : t.text, fontSize: 13, fontWeight: '600' }}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {note && <Text style={{ color: t.sub, fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 }}>{note}</Text>}
      <SectionList
        sections={sections}
        keyExtractor={(e, i) => e.id + i}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<Text style={{ color: t.sub, textAlign: 'center', marginTop: 48 }}>No upcoming events.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderSectionHeader={({ section }) => <Text style={[s.day, { color: t.sub }]}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item)} style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
            <Text style={{ color: t.sub, fontSize: 12, fontWeight: '600' }}>
              {formatTime(item)}{item.source === 'email' ? '  ·  from email' : ''}
            </Text>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginTop: 2 }}>{item.title}</Text>
            {item.location ? <Text style={{ color: t.sub, fontSize: 13, marginTop: 2 }}>{item.location}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  h1: { fontSize: 30, fontWeight: '800' },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  chips: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  day: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  card: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SCHOOL_NAME } from '../config';
import { EventItem, eventsByDay, isElementary, loadEvents } from '../lib';
import { useTheme } from '../theme';
import DaySheet from './DaySheet';
import EventList from './EventList';
import MonthGrid from './MonthGrid';

const ELEM = '__elementary';

export default function Home({ onOpen, onSetup }: { onOpen: (e: EventItem) => void; onSetup: () => void }) {
  const t = useTheme();
  const now = new Date();
  const base = now.getFullYear() * 12 + now.getMonth();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState<'month' | 'list'>('month');
  const [cursor, setCursor] = useState(base); // year*12 + month
  const [day, setDay] = useState<string | null>(null);

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
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const chips = useMemo(() => {
    const cats = Array.from(new Set((events ?? []).map((e) => e.category ?? 'Other').filter((c) => c !== 'Elementary School'))).sort();
    return [{ id: 'All', label: 'All' }, { id: ELEM, label: 'Elementary ★' }, ...cats.map((c) => ({ id: c, label: c }))];
  }, [events]);

  const filtered = useMemo(
    () => (events ?? []).filter((e) => filter === 'All' || (filter === ELEM ? isElementary(e) : (e.category ?? 'Other') === filter)),
    [events, filter],
  );
  const byDay = useMemo(() => eventsByDay(filtered), [filtered]);

  if (!events) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;

  const year = Math.floor(cursor / 12);
  const month = cursor % 12;
  const monthName = new Date(year, month, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
  const onAccent = t.bg === '#0d1117' ? '#0d1117' : '#fff';
  const canPrev = cursor > base;
  const canNext = cursor < base + 3;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.h1, { color: t.text }]}>Events</Text>
          <Text style={{ color: t.sub, fontSize: 12 }}>{SCHOOL_NAME}</Text>
        </View>
        <Pressable onPress={onSetup} style={[s.btn, { backgroundColor: t.chip }]}>
          <Text style={{ color: t.accent, fontWeight: '600', fontSize: 13 }}>Connect email</Text>
        </Pressable>
      </View>

      <View style={s.bar}>
        <View style={[s.seg, { backgroundColor: t.chip }]}>
          {(['month', 'list'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} style={[s.segItem, view === v && { backgroundColor: t.accent }]}>
              <Text style={{ color: view === v ? onAccent : t.text, fontWeight: '600', fontSize: 13 }}>{v === 'month' ? 'Month' : 'List'}</Text>
            </Pressable>
          ))}
        </View>
        {view === 'month' && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Pressable disabled={!canPrev} onPress={() => setCursor(cursor - 1)} hitSlop={10}>
              <Text style={{ color: canPrev ? t.accent : t.line, fontSize: 26, paddingHorizontal: 10 }}>‹</Text>
            </Pressable>
            <Pressable onPress={() => setCursor(base)}>
              <Text style={{ color: t.month, fontSize: 16, fontWeight: '800', minWidth: 130, textAlign: 'center' }}>{monthName}</Text>
            </Pressable>
            <Pressable disabled={!canNext} onPress={() => setCursor(cursor + 1)} hitSlop={10}>
              <Text style={{ color: canNext ? t.accent : t.line, fontSize: 26, paddingHorizontal: 10 }}>›</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={{ flexGrow: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {chips.map((c) => {
            const on = c.id === filter;
            const elem = c.id === ELEM;
            return (
              <Pressable key={c.id} onPress={() => setFilter(c.id)} style={[s.chip, { backgroundColor: on ? (elem ? t.elem : t.accent) : elem ? t.elemTint : t.chip }]}>
                <Text style={{ color: on ? (elem ? t.elemText : onAccent) : t.text, fontSize: 13, fontWeight: '600' }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {view === 'month'
        ? <MonthGrid byDay={byDay} year={year} month={month} onDay={setDay} />
        : <EventList events={filtered} onOpen={onOpen} refreshing={refreshing} onRefresh={refresh} />}

      {note && (
        <Pressable onPress={refresh}>
          <Text style={{ color: t.sub, fontSize: 11, textAlign: 'center', paddingVertical: 6 }}>{note}  ·  tap to refresh</Text>
        </Pressable>
      )}
      <DaySheet dayKey={day} events={day ? byDay.get(day) ?? [] : []} onClose={() => setDay(null)} onOpen={onOpen} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  h1: { fontSize: 28, fontWeight: '800' },
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4 },
  seg: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segItem: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 7 },
  chips: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
});

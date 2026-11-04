import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SCHOOL_NAME } from '../config';
import { EventItem, dayKey, eventsByDay, getMyGrades, isHoliday, isMyGrade, loadEvents, loadMyGrades, visibleEvent } from '../lib';
import { useTheme } from '../theme';
import DaySheet from './DaySheet';
import DayView from './DayView';
import EventList from './EventList';
import MonthGrid from './MonthGrid';

const ELEM = '__mygrade';
const NO_CHIP = ['All School Calendar', 'Middle School', 'Secondary School', 'Elementary School', 'Athletics'];
const MAX_AHEAD = 9; // months ahead the feed covers
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AUTO_REFRESH_MS = 30 * 60 * 1000; // while the app stays open

function Arrow({ dir, enabled, onPress }: { dir: 'prev' | 'next'; enabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      disabled={!enabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.hol, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, opacity: enabled ? (pressed ? 0.7 : 1) : 0.3 }]}>
      <Text style={{ color: t.holText, fontSize: 24, fontWeight: '800', lineHeight: 28, marginTop: -2 }}>{dir === 'prev' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

export default function Home({ onOpen, onAdd, onSettings }: { onOpen: (e: EventItem) => void; onAdd: (day: string) => void; onSettings: () => void }) {
  const t = useTheme();
  const now = new Date();
  const base = now.getFullYear() * 12 + now.getMonth();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [info, setInfo] = useState<{ updated: string | null; offline: boolean; isSeed: boolean } | null>(null);
  const [checked, setChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(ELEM);
  const [view, setView] = useState<'month' | 'day' | 'list'>('month');
  const [dayCur, setDayCur] = useState(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [cursor, setCursor] = useState(base); // year*12 + month
  const [day, setDay] = useState<string | null>(null);
  const [grades, setGrades] = useState(getMyGrades); // the filters below read the chosen grades from lib
  useEffect(() => { loadMyGrades().then((g) => setGrades([...g])); }, []);

  const load = useCallback(async () => {
    const r = await loadEvents();
    setEvents(r.events);
    setInfo({ updated: r.updated, offline: r.offline, isSeed: r.isSeed });
    setChecked(new Date());
  }, []);
  useEffect(() => { load(); }, [load]);
  // iOS keeps the app alive in the background, so reload on return and every so often while open.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') load(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') load(); }, AUTO_REFRESH_MS);
    return () => { sub.remove(); clearInterval(timer); };
  }, [load]);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), new Promise((r) => setTimeout(r, 700))]);
    setRefreshing(false);
  };

  // Swipe left/right on the month grid to change months. Limits live in a ref so
  // the handler never goes stale (e.g. after a live code refresh).
  const limits = useRef({ min: base, max: base + MAX_AHEAD });
  limits.current = { min: base, max: base + MAX_AHEAD };
  const pan = useRef(
    PanResponder.create({
      // Capture phase so the swipe wins over the day squares; starts after a short, mostly-sideways drag.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const { min, max } = limits.current;
        // Short drag, or a quick flick, changes the month.
        const left = g.dx < -35 || (g.dx < -15 && g.vx < -0.35);
        const right = g.dx > 35 || (g.dx > 15 && g.vx > 0.35);
        if (left) setCursor((c) => Math.min(c + 1, max));
        else if (right) setCursor((c) => Math.max(c - 1, min));
      },
    }),
  ).current;

  const shown = useMemo(() => (events ?? []).filter(visibleEvent), [events, grades]);

  const chips = useMemo(() => {
    const cats = Array.from(new Set(shown.map((e) => e.category ?? 'Other').filter((c) => !NO_CHIP.includes(c)))).sort();
    return [{ id: ELEM, label: 'Grade Selected' }, { id: 'All', label: 'All Grades' }, ...cats.map((c) => ({ id: c, label: c }))];
  }, [shown]);

  const filtered = useMemo(
    () => shown.filter((e) => filter === 'All' || (filter === ELEM ? isMyGrade(e) || isHoliday(e) : (e.category ?? 'Other') === filter)),
    [shown, filter],
  );
  const byDay = useMemo(() => eventsByDay(filtered), [filtered]);

  if (!events) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;

  const year = Math.floor(cursor / 12);
  const month = cursor % 12;
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const minDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const maxDay = new Date(now.getFullYear(), now.getMonth() + MAX_AHEAD + 1, 0);
  const shift = (n: number) => setDayCur((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
  const canPrevDay = dayCur > minDay;
  const canNextDay = dayCur < maxDay;
  const headerDate = view === 'month' ? new Date(year, month, 1) : view === 'day' ? dayCur : now;
  const monthName = `${MONTHS[headerDate.getMonth()]} ${headerDate.getFullYear()}`; // "Nov 2026"
  const dayLabel = dayCur.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const onAccent = t.bg === '#0d1117' ? '#0d1117' : '#fff';
  const chipOff = t.bg === '#0d1117' ? '#3a414b' : '#d3d7dd'; // gray until tapped, then green
  const fmt = (d: Date) => d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const statusText = refreshing ? 'Refreshing…'
    : info?.isSeed ? 'Sample events only (live feed not connected) · tap to refresh'
    : [info?.offline ? 'Offline, showing saved events' : info?.updated ? `School feed built ${fmt(new Date(info.updated))}` : null,
       checked ? `checked ${checked.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : null, 'tap to refresh'].filter(Boolean).join(' · ');
  const canPrev = cursor > base;
  const canNext = cursor < base + MAX_AHEAD;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={[s.h1, { color: t.hol, flex: 1, fontSize: 24, fontWeight: 'normal' }]} numberOfLines={1}>Events</Text>
          <Pressable onPress={() => { setCursor(base); setDayCur(today0); }} hitSlop={8}>
            <Text style={[s.h1, { color: t.month, fontSize: 24, fontWeight: 'normal' }]} numberOfLines={1}>{monthName}</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => Linking.openURL('https://shilohsaints.org')} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ color: t.accent, fontSize: 12, textDecorationLine: 'underline' }} numberOfLines={1}>{SCHOOL_NAME}</Text>
        </Pressable>
      </View>

      <View style={s.bar}>
        <View style={[s.seg, { backgroundColor: t.chip }]}>
          {(['month', 'list'] as ('month' | 'day' | 'list')[]).map((v) => ( // Day view is still here; add 'day' back to show its button
            <Pressable key={v} onPress={() => setView(v)} style={[s.segItem, view === v && { backgroundColor: t.accent }]}>
              <Text style={{ color: view === v ? onAccent : t.text, fontWeight: '600', fontSize: 13 }}>{v === 'month' ? 'Month' : v === 'day' ? 'Day' : 'List'}</Text>
            </Pressable>
          ))}
        </View>
        {view === 'month' && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 20, marginRight: 8 }}>
            <Arrow dir="prev" enabled={canPrev} onPress={() => setCursor(cursor - 1)} />
            <Arrow dir="next" enabled={canNext} onPress={() => setCursor(cursor + 1)} />
          </View>
        )}
        {view === 'day' && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Arrow dir="prev" enabled={canPrevDay} onPress={() => shift(-1)} />
            <Pressable onPress={() => setDayCur(today0)}>
              <Text style={{ color: t.month, fontSize: 15, fontWeight: '800', textAlign: 'center' }} numberOfLines={1}>{dayLabel}</Text>
            </Pressable>
            <Arrow dir="next" enabled={canNextDay} onPress={() => shift(1)} />
          </View>
        )}
        {view === 'list' && <View style={{ flex: 1 }} />}
        <Pressable
          onPress={() => onAdd(dayKey(view === 'day' ? dayCur : cursor === base || view === 'list' ? today0 : new Date(year, month, 1)))}
          hitSlop={8}
          accessibilityLabel="Add event"
          style={({ pressed }) => [{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: onAccent, fontSize: 24, fontWeight: '700', lineHeight: 28, marginTop: -2 }}>+</Text>
        </Pressable>
      </View>

      <View style={{ flexGrow: 0, flexDirection: 'row', alignItems: 'center' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={s.chips}>
          {chips.map((c) => {
            const on = c.id === filter;
            return (
              <Pressable key={c.id} onPress={() => setFilter(c.id)} style={[s.chip, { backgroundColor: on ? t.hol : chipOff }]}>
                <Text style={{ color: on ? t.holText : t.text, fontSize: 13, fontWeight: '600' }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={onSettings}
          hitSlop={8}
          accessibilityLabel="Settings"
          style={({ pressed }) => [{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: onAccent, fontSize: 20, lineHeight: 24 }}>{'⚙︎'}</Text>
        </Pressable>
      </View>

      {view === 'month'
        ? <View style={{ flex: 1 }} {...pan.panHandlers}><MonthGrid byDay={byDay} year={year} month={month} onDay={setDay} /></View>
        : view === 'day'
        ? <DayView events={byDay.get(dayKey(dayCur)) ?? []} onOpen={onOpen} />
        : <EventList events={filtered} onOpen={onOpen} refreshing={refreshing} onRefresh={refresh} />}

      <Pressable onPress={refresh} disabled={refreshing} style={s.status}>
        <Text style={{ color: t.accent, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>{statusText}</Text>
      </Pressable>
      <DaySheet dayKey={day} events={day ? byDay.get(day) ?? [] : []} onClose={() => setDay(null)} onOpen={onOpen} onAdd={onAdd} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  h1: { fontSize: 22, fontWeight: '800' },
  status: { paddingVertical: 10, paddingHorizontal: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4 },
  seg: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segItem: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 7 },
  chips: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
});

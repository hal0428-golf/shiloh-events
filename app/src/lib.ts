import AsyncStorage from '@react-native-async-storage/async-storage';
import seed from '../assets/seed-events.json';
import { EVENTS_URL } from './config';

export type EventItem = {
  id: string;
  title: string;
  start: string; // ISO with offset, or YYYY-MM-DD when allDay
  end: string;
  allDay: boolean;
  category: string | null;
  location: string | null;
  description: string | null;
  source: 'web' | 'email';
};

const FIFTH_RE = /\b(5th|fifth)\b/i;
const LOWER_GRADE_RE = /\b(kindergarten|pre-?k|(1st|2nd|3rd|4th) grade)\b/i;
export const isFifth = (e: EventItem) => FIFTH_RE.test(e.title);

// ---- What to show (edit these to change the rules) ----
const HIDDEN_CATEGORIES = ['Middle School', 'Secondary School', 'Elementary School'];
const SPORT_RE = /\b(football|volleyball|soccer|softball|tennis|golf|track|cross country|swim|wrestling|cheer|dance|trap|basketball|baseball)\b/i;
const GAME_RE = /(@|\bvs\.?|tournament|invitational|meet\b|state|classic|conference|jamboree|scrimmage|championship|semifinals|finals)/i;
const HOLIDAY_RE = /(no school|\bbreak\b|\bholiday\b|\bmlk day\b|labor day|memorial day|presidents|good friday|easter monday|new year|teacher work day|virtual learning day|last day of school)/i;

export const isHoliday = (e: EventItem) => HOLIDAY_RE.test(e.title);
export type Kind = 'holiday' | 'elem' | 'other';
export const kindOf = (e: EventItem): Kind => (isHoliday(e) ? 'holiday' : isFifth(e) ? 'elem' : 'other');

/** For 5th grade, only Youth sports (Youth Football, Youth wrestling) are shown from athletics. */
function sportAllowed(title: string): boolean {
  return /\byouth\b/i.test(title);
}
export function visibleEvent(e: EventItem): boolean {
  if (isFifth(e) || isHoliday(e)) return true;
  if (e.category && HIDDEN_CATEGORIES.includes(e.category)) return false;
  if (LOWER_GRADE_RE.test(e.title)) return false;
  if (SPORT_RE.test(e.title) && GAME_RE.test(e.title) && !sportAllowed(e.title)) return false;
  return true;
}

/** Every event on every day (no past filter), elementary first, then all-day, then by time. */
export function eventsByDay(events: EventItem[]): Map<string, EventItem[]> {
  const map = new Map<string, EventItem[]>();
  const add = (k: string, e: EventItem) => map.set(k, [...(map.get(k) ?? []), e]);
  for (const e of events) {
    if (e.allDay) {
      const last = parseDay(e.end);
      for (let d = parseDay(e.start), n = 0; d <= last && n < 31; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), n++) add(dayKey(d), e);
    } else add(dayKey(startDate(e)), e);
  }
  for (const list of map.values()) {
    const rank = (e: EventItem) => (isHoliday(e) ? 2 : isFifth(e) ? 1 : 0);
    list.sort((a, b) => rank(b) - rank(a) || Number(b.allDay) - Number(a.allDay) || startDate(a).getTime() - startDate(b).getTime());
  }
  return map;
}

type Feed = { generated: string; events: EventItem[] };
const CACHE_KEY = 'events-cache-v1';

export function parseDay(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const startDate = (e: EventItem) => (e.allDay ? parseDay(e.start) : new Date(e.start));
export const endDate = (e: EventItem) =>
  e.allDay ? new Date(parseDay(e.end).getTime() + 86400000 - 1) : new Date(e.end);

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatTime(e: EventItem): string {
  if (e.allDay) return 'All day';
  const f = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', ' ');
  return `${f(new Date(e.start))} – ${f(new Date(e.end))}`;
}

export function formatDayHeader(key: string, today = new Date()): string {
  const d = parseDay(key);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d.getTime() - t0.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Group current/upcoming events by day. Multi-day all-day events appear on each day. */
export function groupByDay(events: EventItem[], now = new Date()) {
  const todayKey = dayKey(now);
  const map = new Map<string, EventItem[]>();
  const add = (k: string, e: EventItem) => map.set(k, [...(map.get(k) ?? []), e]);
  for (const e of events) {
    if (endDate(e) < now) continue;
    if (e.allDay) {
      const last = parseDay(e.end);
      for (let d = parseDay(e.start), n = 0; d <= last && n < 14; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), n++) {
        if (dayKey(d) >= todayKey) add(dayKey(d), e);
      }
    } else {
      const k = dayKey(startDate(e));
      add(k < todayKey ? todayKey : k, e);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, data]) => ({
      key,
      title: formatDayHeader(key, now),
      data: data.sort((a, b) => Number(a.allDay === false) - Number(b.allDay === false) || startDate(a).getTime() - startDate(b).getTime()),
    }));
}

export async function loadEvents(): Promise<{ events: EventItem[]; updated: string | null; offline: boolean; isSeed: boolean }> {
  try {
    if (EVENTS_URL.includes('YOUR-')) throw new Error('events URL not configured');
    const r = await fetch(`${EVENTS_URL}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const feed = (await r.json()) as Feed;
    try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feed)); } catch {}
    return { events: feed.events, updated: feed.generated, offline: false, isSeed: false };
  } catch {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const feed = JSON.parse(cached) as Feed;
        return { events: feed.events, updated: feed.generated, offline: true, isSeed: false };
      }
    } catch {}
    const feed = seed as Feed;
    return { events: feed.events, updated: feed.generated, offline: true, isSeed: true };
  }
}

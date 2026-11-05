import AsyncStorage from '@react-native-async-storage/async-storage';
import { LockedFeed, clearAccess, getAccess, isListed, unlockFeed } from './access';
import { FEED_URL } from './config';
import { Overrides, applyOverrides, loadOverrides } from './edits';
import { loadFamilyEvents } from './familyCal';

export type EventItem = {
  id: string;
  title: string;
  start: string; // ISO with offset, or YYYY-MM-DD when allDay
  end: string;
  allDay: boolean;
  category: string | null;
  location: string | null;
  description: string | null;
  source: 'web' | 'email' | 'manual' | 'calendar'; // calendar: read from a calendar on this phone (e.g. Duet)
};

// ---- Grades (chosen in Settings; 5th grade until changed) ----
/** -1 is Pre-K, 0 is Kindergarten, 1-12 are grades. */
export type Grade = number;
export const GRADES: Grade[] = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const WORD: Record<number, string> = { 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth' };
// Class names only mark an event as yours; "Senior Night" etc. shouldn't hide it from other grades.
const CLASS: Record<number, string> = { 9: 'freshm[ae]n', 10: 'sophomores?', 11: 'juniors?', 12: 'seniors?' };
// 1st-4th need "grade" after them so "1st Round Playoffs" isn't a grade.
const GRADE_RE: Record<number, RegExp> = Object.fromEntries(GRADES.map((g) => [g,
  g === -1 ? /\bpre-?k\b/i
  : g === 0 ? /\bkindergarten\b/i
  : g <= 4 ? new RegExp(`\\b${ORD[g]} grade\\b`, 'i')
  : new RegExp(`\\b(${ORD[g]}|${WORD[g]})\\b`, 'i')]));
const CLASS_RE: Record<number, RegExp> = Object.fromEntries(Object.entries(CLASS).map(([g, w]) => [g, new RegExp(`\\b${w}\\b`, 'i')]));

export const gradeName = (g: Grade) => (g === -1 ? 'Pre-K' : g === 0 ? 'Kindergarten' : `${ORD[g]} grade`);
export const gradeShort = (g: Grade) => (g === -1 ? 'Pre-K' : g === 0 ? 'K' : ORD[g]);

const GRADES_KEY = 'my-grades-v1';
let myGrades: Grade[] = [5];
export const getMyGrades = () => myGrades;
export async function loadMyGrades(): Promise<Grade[]> {
  try {
    const s = await AsyncStorage.getItem(GRADES_KEY);
    const g = s ? (JSON.parse(s) as Grade[]).filter((x) => GRADES.includes(x)) : [];
    if (g.length) myGrades = g;
  } catch {}
  return myGrades;
}
export async function saveMyGrades(g: Grade[]): Promise<void> {
  myGrades = GRADES.filter((x) => g.includes(x));
  try { await AsyncStorage.setItem(GRADES_KEY, JSON.stringify(myGrades)); } catch {}
}

const mentions = (e: EventItem, g: Grade) => GRADE_RE[g].test(e.title) || !!CLASS_RE[g]?.test(e.title);
/** For one of the grades chosen in Settings. */
export const isMyGrade = (e: EventItem) => myGrades.some((g) => mentions(e, g));
/** e.g. "5th grade", for the event's line under the time. */
export const myGradeLabel = (e: EventItem) => myGrades.filter((g) => mentions(e, g)).map(gradeName).join(', ');
const forSomeGrade = (e: EventItem) => GRADES.some((g) => GRADE_RE[g].test(e.title));

// ---- What to show (edit these to change the rules) ----
const HIDDEN_CATEGORIES = ['Middle School', 'Secondary School', 'Elementary School'];
const SPORT_RE = /\b(football|volleyball|soccer|softball|tennis|golf|track|cross country|swim|wrestling|cheer|dance|trap|basketball|baseball)\b/i;
const GAME_RE = /(@|\bvs\.?|tournament|invitational|meet\b|state|classic|conference|jamboree|scrimmage|championship|semifinals|finals)/i;
const HOLIDAY_RE = /(no school|\bbreak\b|\bholiday\b|\bmlk day\b|labor day|memorial day|presidents|good friday|easter monday|new year|teacher work day|virtual learning day|last day of school)/i;

export const isHoliday = (e: EventItem) => HOLIDAY_RE.test(e.title);
/** From a forwarded email or added in the app; these are orange and can be edited. */
/** From a "Parent Schedule" email: an all-day event titled with the parent's name (Jeff or Carrie). */
export const isParent = (e: EventItem) => e.category === 'Parent';
export const isEmail = (e: EventItem) => (e.source === 'email' && !isParent(e)) || e.source === 'manual';
/** From the co-parent calendar on this phone (Settings); purple. */
export const isFamily = (e: EventItem) => e.source === 'calendar';
export type Kind = 'jeff' | 'carrie' | 'parent' | 'email' | 'family' | 'holiday' | 'elem' | 'other';
/** Email/added events are orange even when they are also for your grade or a holiday. */
const parentKind = (e: EventItem): Kind => (/^jeff\b/i.test(e.title) ? 'jeff' : /^carrie\b/i.test(e.title) ? 'carrie' : 'parent');
export const kindOf = (e: EventItem): Kind => (isParent(e) ? parentKind(e) : isEmail(e) ? 'email' : isFamily(e) ? 'family' : isHoliday(e) ? 'holiday' : isMyGrade(e) ? 'elem' : 'other');

/** Only Youth sports (Youth Football, Youth wrestling) are shown from athletics. */
function sportAllowed(title: string): boolean {
  return /\byouth\b/i.test(title);
}
export function visibleEvent(e: EventItem): boolean {
  if (e.source === 'manual' || isParent(e) || isFamily(e) || isMyGrade(e) || isHoliday(e)) return true;
  if (e.category && HIDDEN_CATEGORIES.includes(e.category)) return false;
  if (forSomeGrade(e)) return false; // another grade's event
  if (SPORT_RE.test(e.title) && GAME_RE.test(e.title) && !sportAllowed(e.title)) return false;
  return true;
}

/** Every event on every day (no past filter), your grade first, then all-day, then by time. */
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
    const rank = (e: EventItem) => (isParent(e) ? 3 : isHoliday(e) ? 2 : isMyGrade(e) || isEmail(e) || isFamily(e) ? 1 : 0);
    list.sort((a, b) => rank(b) - rank(a) || Number(b.allDay) - Number(a.allDay) || startDate(a).getTime() - startDate(b).getTime());
  }
  return map;
}

type Feed = { generated: string; events: EventItem[]; overrides?: Overrides };
const CACHE_KEY = 'events-cache-v2';
/** none: no access code on this phone yet. revoked: the code was removed from the list. */
export type Locked = 'none' | 'revoked';

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

export async function loadEvents(): Promise<{ events: EventItem[]; updated: string | null; offline: boolean; isSeed: boolean; locked?: Locked }> {
  const r = await loadFeed();
  if (r.locked) return { events: [], updated: null, offline: false, isSeed: false, locked: r.locked };
  const [ov, fam] = await Promise.all([loadOverrides(r.overrides), loadFamilyEvents()]);
  return { events: [...applyOverrides(r.events, ov), ...fam], updated: r.updated, offline: r.offline, isSeed: false };
}

async function loadFeed(): Promise<{ events: EventItem[]; overrides?: Overrides; updated: string | null; offline: boolean; locked?: Locked }> {
  const a = await getAccess();
  if (!a) return { events: [], updated: null, offline: false, locked: 'none' };
  let locked: LockedFeed;
  try {
    const r = await fetch(`${FEED_URL}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    locked = (await r.json()) as LockedFeed;
  } catch {
    // Offline: show the last calendar this phone unlocked.
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const feed = JSON.parse(cached) as Feed;
        return { events: feed.events, overrides: feed.overrides, updated: feed.generated, offline: true };
      }
    } catch {}
    return { events: [], updated: null, offline: true };
  }
  if (!isListed(locked, a)) {
    // This code was removed: forget it and the saved calendar.
    try { await AsyncStorage.removeItem(CACHE_KEY); } catch {}
    await clearAccess().catch(() => {});
    return { events: [], updated: null, offline: false, locked: 'revoked' };
  }
  const feed = unlockFeed<Feed>(locked, a);
  if (!feed) throw new Error('Could not read the calendar');
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feed)); } catch {}
  return { events: feed.events, overrides: feed.overrides, updated: feed.generated, offline: false };
}

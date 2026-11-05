import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar/legacy';
import type { EventItem } from './lib';

// A calendar on this iPhone (e.g. "Duet" from the Duet co-parent app) whose events
// are shown next to the school events. They stay on the phone; nothing is uploaded.
export type FamilyCal = { id: string; title: string };
const KEY = 'family-calendar-v1';

export async function getFamilyCal(): Promise<FamilyCal | null> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? (JSON.parse(s) as FamilyCal) : null;
  } catch {
    return null;
  }
}
export async function setFamilyCal(c: FamilyCal | null): Promise<void> {
  try {
    if (c) await AsyncStorage.setItem(KEY, JSON.stringify(c));
    else await AsyncStorage.removeItem(KEY);
  } catch {}
}

/** Asks for calendar access (once) and lists the phone's calendars, or null if access is denied. */
export async function listPhoneCalendars(): Promise<(FamilyCal & { source: string; color: string })[] | null> {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (!perm.granted) return null;
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals
    .map((c) => ({ id: c.id, title: c.title, source: c.source?.name ?? '', color: c.color ?? '#888888' }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

const p2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Events from the chosen calendar, from a month ago to six months ahead. Empty if none chosen or no access. */
export async function loadFamilyEvents(): Promise<EventItem[]> {
  const cal = await getFamilyCal();
  if (!cal) return [];
  try {
    const { granted } = await Calendar.getCalendarPermissionsAsync();
    if (!granted) return [];
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 6, 1);
    const list = await Calendar.getEventsAsync([cal.id], from, to);
    return list.map((e) => {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      // All-day events can end at midnight of the next day; keep them on their last real day.
      const last = e.allDay && en.getTime() > s.getTime() && en.getHours() === 0 && en.getMinutes() === 0 ? new Date(en.getTime() - 1) : en;
      return {
        id: `cal:${e.id}:${s.getTime()}`, // repeating events share one id
        title: e.title || '(no title)',
        start: e.allDay ? ymd(s) : s.toISOString(),
        end: e.allDay ? ymd(last) : en.toISOString(),
        allDay: !!e.allDay,
        category: cal.title,
        location: e.location || null,
        description: e.notes || null,
        source: 'calendar' as const,
      };
    });
  } catch {
    return [];
  }
}

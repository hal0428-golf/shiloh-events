import AsyncStorage from '@react-native-async-storage/async-storage';
import { PARENTS_PATH } from './config';
import { getEditKey, readRepoJson, writeRepoJson } from './edits';
import type { EventItem } from './lib';

// A basic co-parenting schedule, like Duet: two parents, each with a color, and who has the kids each day.
// Saved to the repo with the editing key and shared with everyone through the locked feed.
export type Parent = { name: string; color: string };
export type ParentPlan = { parents: [Parent, Parent]; child?: string; days: Record<string, 0 | 1> };

export const PARENT_COLORS = ['#40b0ff', '#34c759', '#bf5af2', '#ff9f0a', '#ff6482', '#64d2ff', '#ffd60a', '#a2845e'];
export const DEFAULT_PLAN: ParentPlan = { parents: [{ name: 'Jeff', color: '#40b0ff' }, { name: 'Carrie', color: '#34c759' }], days: {} };

const LOCAL_KEY = 'parents-local-v1'; // this phone's latest save, until the locked feed catches up
const LOCAL_TTL_MS = 10 * 60 * 1000;

let plan: ParentPlan = DEFAULT_PLAN;
export const getPlan = () => plan;

const valid = (p: any): p is ParentPlan =>
  !!p && Array.isArray(p.parents) && p.parents.length === 2 && p.parents.every((x: any) => x && typeof x.name === 'string') && !!p.days && typeof p.days === 'object';

/** The schedule to show: live from GitHub with the editing key, else the copy in the locked feed; a fresh local save wins. */
export async function loadPlan(fromFeed?: unknown): Promise<ParentPlan> {
  let p: ParentPlan | null = valid(fromFeed) ? fromFeed : null;
  const token = await getEditKey().catch(() => null);
  if (token) {
    try {
      const { data } = await readRepoJson<ParentPlan>(PARENTS_PATH, token);
      if (valid(data)) p = data;
    } catch {}
  }
  try {
    const s = await AsyncStorage.getItem(LOCAL_KEY);
    if (s) {
      const { at, p: mine } = JSON.parse(s) as { at: number; p: ParentPlan };
      if (Date.now() - at < LOCAL_TTL_MS && valid(mine)) p = mine;
    }
  } catch {}
  plan = p ?? DEFAULT_PLAN;
  return plan;
}

export async function savePlan(p: ParentPlan): Promise<void> {
  const token = await getEditKey();
  if (!token) throw new Error('No editing key on this phone.');
  await writeRepoJson(PARENTS_PATH, p, 'Update parenting schedule', token);
  plan = p;
  try { await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify({ at: Date.now(), p })); } catch {}
}

/** 0 or 1 for an event titled with a parent's name (or initial), else -1. */
export function parentIndex(title: string): -1 | 0 | 1 {
  const t = title.trim().toLowerCase();
  for (const i of [0, 1] as const) {
    const n = plan.parents[i].name.trim().toLowerCase();
    if (n && (t === n || t.startsWith(n + ' ') || t === n[0])) return i;
  }
  return -1;
}

/** Black or white text, whichever reads better on the color. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#000000';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#000000' : '#ffffff';
}

/** One all-day event per assigned day, titled with the parent's name. */
export function planEvents(p: ParentPlan): EventItem[] {
  return Object.entries(p.days).map(([day, who]) => ({
    id: `plan_${day}`, title: p.parents[who]?.name || `Parent ${who + 1}`, start: day, end: day, allDay: true,
    category: 'Parent', location: null, description: null, source: 'plan' as const,
  }));
}

export const dayKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

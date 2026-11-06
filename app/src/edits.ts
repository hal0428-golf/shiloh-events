import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { GITHUB_REPO, OVERRIDES_PATH } from './config';
import type { EventItem } from './lib';

/** A shared change to one email event, or an event added in the app (added: true), keyed by event id in docs/overrides.json. */
export type Override = {
  added?: boolean;
  deleted?: boolean;
  title?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  location?: string | null;
  description?: string | null;
};
export type Overrides = Record<string, Override>;

const KEY_NAME = 'github-edit-key';
const CACHE_KEY = 'overrides-cache-v1';
const LOCAL_KEY = 'overrides-local-v1'; // this phone's recent saves, until the shared copy catches up
const LOCAL_TTL_MS = 10 * 60 * 1000;
const API = `https://api.github.com/repos/${GITHUB_REPO}/contents/${OVERRIDES_PATH}`;

export const getEditKey = () => SecureStore.getItemAsync(KEY_NAME);
export const setEditKey = (k: string) => SecureStore.setItemAsync(KEY_NAME, k.trim());
export const clearEditKey = () => SecureStore.deleteItemAsync(KEY_NAME);

const headers = (token: string | null) => ({
  Accept: 'application/vnd.github+json',
  'Cache-Control': 'no-cache',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const ADDED_CATEGORY = 'Added';

export function applyOverrides(events: EventItem[], ov: Overrides): EventItem[] {
  const edited = events
    .filter((e) => !ov[e.id]?.deleted)
    .map((e) => {
      const o = ov[e.id];
      if (!o) return e;
      const { deleted, added, ...fields } = o;
      return { ...e, ...fields };
    });
  const added: EventItem[] = Object.entries(ov)
    .filter(([, o]) => o.added && !o.deleted && o.title && o.start)
    .map(([id, o]) => ({
      id,
      title: o.title!,
      start: o.start!,
      end: o.end ?? o.start!,
      allDay: o.allDay ?? true,
      category: ADDED_CATEGORY,
      location: o.location ?? null,
      description: o.description ?? null,
      source: 'manual',
    }));
  return [...edited, ...added];
}

export const newEventId = () => `manual_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function readJson<T>(key: string): Promise<T | null> {
  try { const s = await AsyncStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}

async function fetchRemote(token: string | null): Promise<{ ov: Overrides; sha?: string }> {
  const r = await fetch(`${API}?t=${Date.now()}`, { headers: headers(token) });
  if (r.status === 404) return { ov: {} };
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const j = await r.json();
  return { ov: JSON.parse(fromBase64(j.content)), sha: j.sha };
}

/** Shared overrides plus this phone's very recent saves. Falls back to the last copy seen when offline. */
/** With the editing key: the live shared file. Without it (the repo is private): the copy inside the locked feed. */
export async function loadOverrides(fromFeed: Overrides = {}): Promise<Overrides> {
  let ov: Overrides;
  const token = await getEditKey();
  if (!token) ov = { ...fromFeed };
  else try {
    ov = (await fetchRemote(token)).ov;
    try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(ov)); } catch {}
  } catch {
    ov = (await readJson<Overrides>(CACHE_KEY)) ?? {};
  }
  const local = (await readJson<Record<string, { at: number; o: Override }>>(LOCAL_KEY)) ?? {};
  for (const [id, { at, o }] of Object.entries(local)) if (Date.now() - at < LOCAL_TTL_MS) ov[id] = o;
  return ov;
}

/** Save one event's change to the shared file. Throws with a readable message on failure. */
export async function saveOverride(id: string, o: Override, title: string): Promise<void> {
  const token = await getEditKey();
  if (!token) throw new Error('No editing key on this phone.');
  for (let attempt = 0; attempt < 3; attempt++) {
    const { ov, sha } = await fetchRemote(token);
    const verb = o.deleted ? 'Delete' : o.added && !(id in ov) ? 'Add' : 'Edit';
    ov[id] = o;
    const body = {
      message: `${verb} event: ${o.title ?? title}`,
      content: toBase64(JSON.stringify(ov, null, 1) + '\n'),
      ...(sha ? { sha } : {}),
    };
    const w = await fetch(API, { method: 'PUT', headers: { ...headers(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (w.ok) {
      const local = (await readJson<Record<string, { at: number; o: Override }>>(LOCAL_KEY)) ?? {};
      local[id] = { at: Date.now(), o };
      try { await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(local)); } catch {}
      return;
    }
    if (w.status === 401 || w.status === 403) throw new Error('The editing key was rejected. It may be wrong or expired.');
    if (w.status !== 409 && w.status !== 422) throw new Error(`Save failed (GitHub ${w.status}).`);
    // 409/422: someone else saved at the same moment; reread and try again.
  }
  throw new Error('Save failed, please try again.');
}

// ---- Any small JSON file in the repo (used by the parenting schedule) ----
const apiFor = (path: string) => `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

export async function readRepoJson<T>(path: string, token: string): Promise<{ data: T | null; sha?: string }> {
  const r = await fetch(`${apiFor(path)}?t=${Date.now()}`, { headers: headers(token) });
  if (r.status === 404) return { data: null };
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const j = await r.json();
  return { data: JSON.parse(fromBase64(j.content)) as T, sha: j.sha };
}

/** Replace the whole file. Throws with a readable message on failure. */
export async function writeRepoJson(path: string, data: unknown, message: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { sha } = await readRepoJson(path, token);
    const body = { message, content: toBase64(JSON.stringify(data, null, 1) + NL), ...(sha ? { sha } : {}) };
    const w = await fetch(apiFor(path), { method: 'PUT', headers: { ...headers(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (w.ok) return;
    if (w.status === 401 || w.status === 403) throw new Error('The editing key was rejected. It may be wrong or expired.');
    if (w.status !== 409 && w.status !== 422) throw new Error(`Save failed (GitHub ${w.status}).`);
  }
  throw new Error('Save failed, please try again.');
}
const NL = String.fromCharCode(10);

// ---- UTF-8 safe base64 (GitHub's contents API uses base64) ----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(s: string): string {
  const bin = encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  let out = '';
  for (let i = 0; i < bin.length; i += 3) {
    const n = (bin.charCodeAt(i) << 16) | ((bin.charCodeAt(i + 1) || 0) << 8) | (bin.charCodeAt(i + 2) || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bin.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bin.length ? B64[n & 63] : '=');
  }
  return out;
}

function fromBase64(b: string): string {
  const clean = b.replace(/[^A-Za-z0-9+/]/g, '');
  let bin = '';
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) | (B64.indexOf(clean[i + 3] ?? 'A') & 63);
    bin += String.fromCharCode((n >> 16) & 255);
    if (i + 2 < clean.length) bin += String.fromCharCode((n >> 8) & 255);
    if (i + 3 < clean.length) bin += String.fromCharCode(n & 255);
  }
  return decodeURIComponent(bin.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
}

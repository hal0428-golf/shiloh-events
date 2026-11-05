import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import * as SecureStore from 'expo-secure-store';

// The calendar feed is locked; each person you invite gets their own access code.
// Must match backend/access.py (salt, iteration count, key layout).
const SALT = 'shiloh-events-access-v1';
const ITERATIONS = 30000;
const STORE_KEY = 'access-v1';

export type Access = { kek: string; id: string }; // derived from the code; the code itself is not kept
export type LockedFeed = { v: number; iv: string; data: string; keys: { id: string; iv: string; k: string }[] };

export const normalize = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function deriveAccess(code: string): Promise<Access> {
  const dk = await pbkdf2Async(sha256, normalize(code), SALT, { c: ITERATIONS, dkLen: 48 });
  return { kek: toHex(dk.slice(0, 32)), id: toHex(dk.slice(32)) };
}

export async function getAccess(): Promise<Access | null> {
  try {
    const s = await SecureStore.getItemAsync(STORE_KEY);
    return s ? (JSON.parse(s) as Access) : null;
  } catch {
    return null;
  }
}
export const saveAccess = (a: Access) => SecureStore.setItemAsync(STORE_KEY, JSON.stringify(a));
export const clearAccess = () => SecureStore.deleteItemAsync(STORE_KEY);

/** False when this phone's code is not (or no longer) on the list. */
export const isListed = (feed: LockedFeed, a: Access) => Array.isArray(feed.keys) && feed.keys.some((k) => k.id === a.id);

/** The feed's contents, or null when this code is not (or no longer) on the list. */
export function unlockFeed<T>(feed: LockedFeed, a: Access): T | null {
  const entry = feed.keys.find((k) => k.id === a.id);
  if (!entry) return null;
  try {
    const key = gcm(fromHex(a.kek), fromB64(entry.iv)).decrypt(fromB64(entry.k));
    const plain = gcm(key, fromB64(feed.iv)).decrypt(fromB64(feed.data));
    return JSON.parse(utf8(plain)) as T;
  } catch {
    return null;
  }
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function fromB64(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) | (B64.indexOf(clean[i + 3] ?? 'A') & 63);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length && o < out.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length && o < out.length) out[o++] = n & 255;
  }
  return out.slice(0, o);
}
/** UTF-8 bytes to text (no TextDecoder needed). */
function utf8(b: Uint8Array): string {
  const cps: number[] = [];
  for (let i = 0; i < b.length; ) {
    const x = b[i++];
    if (x < 0x80) cps.push(x);
    else if (x < 0xe0) cps.push(((x & 0x1f) << 6) | (b[i++] & 0x3f));
    else if (x < 0xf0) cps.push(((x & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f));
    else cps.push(((x & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f));
  }
  let s = '';
  for (let i = 0; i < cps.length; i += 4096) s += String.fromCodePoint(...cps.slice(i, i + 4096));
  return s;
}

import { useColorScheme } from 'react-native';
import { getPlan, textOn } from './parents';

export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return dark
    ? { bg: '#0d1117', card: '#161b22', text: '#f0f3f6', sub: '#9aa4b2', line: '#262d36', accent: '#6ea8ff', chip: '#1f2630', elem: '#ffd60a', elemText: '#2a2400', elemTint: '#ffd60a', email: '#ff9500', emailText: '#2a1400', emailTint: '#ff9500', family: '#bf5af2', familyText: '#ffffff', site: '#30c5d2', siteText: '#002a2e', jeff: '#40b0ff', carrie: '#34c759', parent: '#8e8e93', cellWeekday: '#0b1f44', cellWeekend: '#2b2f36', cellText: '#f0f3f6', month: '#ffd60a', hol: '#34c759', holText: '#04210f', holTint: 'rgba(52,199,89,0.35)' }
    : { bg: '#f4f6fa', card: '#ffffff', text: '#101828', sub: '#5b6577', line: '#e3e7ee', accent: '#051b41', chip: '#e8ecf4', elem: '#ffd60a', elemText: '#2a2400', elemTint: '#ffd60a', email: '#ff9500', emailText: '#2a1400', emailTint: '#ff9500', family: '#af52de', familyText: '#ffffff', site: '#30c5d2', siteText: '#002a2e', jeff: '#40b0ff', carrie: '#34c759', parent: '#8e8e93', cellWeekday: '#0b1f44', cellWeekend: '#2b2f36', cellText: '#f0f3f6', month: '#b88700', hol: '#34c759', holText: '#04210f', holTint: 'rgba(52,199,89,0.35)' };
}

export type Theme = ReturnType<typeof useTheme>;
/** Bar/accent colors for an event kind. */
export function kindStyle(t: Theme, kind: 'p1' | 'p2' | 'parent' | 'email' | 'family' | 'site' | 'holiday' | 'elem' | 'other') {
  if (kind === 'p1' || kind === 'p2') {
    const c = getPlan().parents[kind === 'p1' ? 0 : 1].color;
    return { bg: c, fg: textOn(c), edge: c, bold: true };
  }
  if (kind === 'parent') return { bg: t.parent, fg: '#ffffff', edge: t.parent, bold: true };
  if (kind === 'email') return { bg: t.email, fg: t.emailText, edge: t.email, bold: true };
  if (kind === 'family') return { bg: t.family, fg: t.familyText, edge: t.family, bold: true };
  if (kind === 'site') return { bg: t.site, fg: t.siteText, edge: t.site, bold: true };
  if (kind === 'holiday') return { bg: t.hol, fg: t.holText, edge: t.hol, bold: true };
  if (kind === 'elem') return { bg: t.elem, fg: t.elemText, edge: t.elem, bold: true };
  return { bg: t.chip, fg: t.text, edge: t.line, bold: false };
}

import { useColorScheme } from 'react-native';

export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return dark
    ? { bg: '#0d1117', card: '#161b22', text: '#f0f3f6', sub: '#9aa4b2', line: '#262d36', accent: '#6ea8ff', chip: '#1f2630', elem: '#fff0a0', elemText: '#2a2400', elemTint: 'rgba(255,240,160,0.35)', cellWeekday: '#0b1f44', cellWeekend: '#2b2f36', cellText: '#f0f3f6', month: '#ffd60a', hol: '#34c759', holText: '#04210f', holTint: 'rgba(52,199,89,0.35)' }
    : { bg: '#f4f6fa', card: '#ffffff', text: '#101828', sub: '#5b6577', line: '#e3e7ee', accent: '#051b41', chip: '#e8ecf4', elem: '#fff0a0', elemText: '#2a2400', elemTint: 'rgba(255,240,160,0.35)', cellWeekday: '#0b1f44', cellWeekend: '#2b2f36', cellText: '#f0f3f6', month: '#b88700', hol: '#34c759', holText: '#04210f', holTint: 'rgba(52,199,89,0.35)' };
}

export type Theme = ReturnType<typeof useTheme>;
/** Bar/accent colors for an event kind. */
export function kindStyle(t: Theme, kind: 'holiday' | 'elem' | 'other') {
  if (kind === 'holiday') return { bg: t.hol, fg: t.holText, edge: t.hol, bold: true };
  if (kind === 'elem') return { bg: t.elem, fg: t.elemText, edge: t.elem, bold: true };
  return { bg: t.chip, fg: t.text, edge: t.line, bold: false };
}

import { useColorScheme } from 'react-native';

export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return dark
    ? { bg: '#0d1117', card: '#161b22', text: '#f0f3f6', sub: '#9aa4b2', line: '#262d36', accent: '#6ea8ff', chip: '#1f2630', gold: '#c5a35a', goldText: '#1b1405', goldTint: 'rgba(197,163,90,0.18)' }
    : { bg: '#f4f6fa', card: '#ffffff', text: '#101828', sub: '#5b6577', line: '#e3e7ee', accent: '#051b41', chip: '#e8ecf4', gold: '#c5a35a', goldText: '#1b1405', goldTint: 'rgba(197,163,90,0.22)' };
}

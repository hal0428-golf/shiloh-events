import { useColorScheme } from 'react-native';

export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return dark
    ? { bg: '#0d1117', card: '#161b22', text: '#f0f3f6', sub: '#9aa4b2', line: '#262d36', accent: '#6ea8ff', chip: '#1f2630', elem: '#34c759', elemText: '#04210f', elemTint: 'rgba(52,199,89,0.20)', month: '#ffd60a' }
    : { bg: '#f4f6fa', card: '#ffffff', text: '#101828', sub: '#5b6577', line: '#e3e7ee', accent: '#051b41', chip: '#e8ecf4', elem: '#34c759', elemText: '#04210f', elemTint: 'rgba(52,199,89,0.22)', month: '#b88700' };
}

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EventItem, dayKey, isFifth, isHoliday, kindOf } from '../lib';
import { kindStyle, useTheme } from '../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const BAR_H = 12;

export default function MonthGrid({
  byDay, year, month, onDay,
}: { byDay: Map<string, EventItem[]>; year: number; month: number; onDay: (key: string) => void }) {
  const t = useTheme();
  const [rowH, setRowH] = useState(80);
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + days) / 7);
  const todayKey = dayKey(new Date());
  const maxBars = Math.max(1, Math.floor((rowH - 22) / (BAR_H + 1)));

  return (
    <View style={{ flex: 1, paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: t.month, backgroundColor: i >= 5 ? t.cellWeekend : t.cellWeekday, fontSize: 11, fontWeight: '800', paddingVertical: 3, marginBottom: 2, marginHorizontal: 0.5, overflow: 'hidden', borderRadius: 3 }}>{d}</Text>
        ))}
      </View>
      <View style={{ flex: 1 }} onLayout={(e) => setRowH(e.nativeEvent.layout.height / weeks)}>
        {Array.from({ length: weeks }, (_, w) => (
          <View key={w} style={{ flex: 1, flexDirection: 'row' }}>
            {Array.from({ length: 7 }, (_, c) => {
              const n = w * 7 + c - offset + 1;
              if (n < 1 || n > days) return <View key={c} style={{ flex: 1 }} />;
              const key = dayKey(new Date(year, month, n));
              const list = byDay.get(key) ?? [];
              const hasElem = list.some(isFifth);
              const hasHol = list.some(isHoliday);
              const shown = list.length > maxBars ? Math.max(maxBars - 1, 0) : list.length;
              const extra = list.length - shown;
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={c}
                  onPress={() => onDay(key)}
                  style={{
                    flex: 1, padding: 1.5, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line,
                    backgroundColor: hasHol ? t.holTint : hasElem ? t.elemTint : c >= 5 ? t.cellWeekend : t.cellWeekday, overflow: 'hidden',
                  }}>
                  <View style={[st.num, isToday && { backgroundColor: '#ffd60a' }]}>
                    <Text style={{ fontSize: 11, fontWeight: isToday ? '800' : '700', color: isToday ? '#1a1400' : t.cellText }}>{n}</Text>
                  </View>
                  {list.slice(0, shown).map((e, i) => {
                    const k = kindStyle(t, kindOf(e));
                    return (
                      <View key={e.id + i} style={[st.bar, { backgroundColor: k.bg }]}>
                        <Text numberOfLines={1} style={{ fontSize: 8.5, fontWeight: k.bold ? '700' : '500', color: k.fg }}>{e.title}</Text>
                      </View>
                    );
                  })}
                  {extra > 0 && <Text style={{ fontSize: 9, color: t.cellText, fontWeight: '700', paddingLeft: 2 }}>+{extra}</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  num: { alignSelf: 'flex-start', minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  bar: { height: BAR_H, borderRadius: 3, paddingHorizontal: 2, justifyContent: 'center', marginTop: 1 },
});

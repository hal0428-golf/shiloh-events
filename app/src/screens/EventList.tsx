import { Pressable, RefreshControl, SectionList, StyleSheet, Text } from 'react-native';
import { EventItem, formatTime, groupByDay, isElementary } from '../lib';
import { useTheme } from '../theme';

export default function EventList({
  events, onOpen, refreshing, onRefresh,
}: { events: EventItem[]; onOpen: (e: EventItem) => void; refreshing: boolean; onRefresh: () => void }) {
  const t = useTheme();
  return (
    <SectionList
      sections={groupByDay(events)}
      keyExtractor={(e, i) => e.id + i}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={{ color: t.sub, textAlign: 'center', marginTop: 48 }}>No upcoming events.</Text>}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderSectionHeader={({ section }) => <Text style={[s.day, { color: t.sub }]}>{section.title}</Text>}
      renderItem={({ item }) => {
        const el = isElementary(item);
        return (
          <Pressable
            onPress={() => onOpen(item)}
            style={[s.card, { backgroundColor: t.card, borderColor: t.line, borderLeftColor: el ? t.gold : t.line, borderLeftWidth: el ? 5 : StyleSheet.hairlineWidth }]}>
            <Text style={{ color: t.sub, fontSize: 12, fontWeight: '600' }}>
              {formatTime(item)}{el ? '  ·  Elementary' : ''}{item.source === 'email' ? '  ·  from email' : ''}
            </Text>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginTop: 2 }}>{item.title}</Text>
            {item.location ? <Text style={{ color: t.sub, fontSize: 13, marginTop: 2 }}>{item.location}</Text> : null}
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  day: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  card: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});

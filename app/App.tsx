import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import EventDetail from './src/screens/EventDetail';
import Home from './src/screens/Home';
import Settings from './src/screens/Settings';
import SetupEmail from './src/screens/SetupEmail';
import { ADDED_CATEGORY, newEventId } from './src/edits';
import { EventItem } from './src/lib';
import { useTheme } from './src/theme';

const blankEvent = (day: string): EventItem => ({
  id: newEventId(), title: '', start: day, end: day, allDay: true,
  category: ADDED_CATEGORY, location: null, description: null, source: 'manual',
});

export default function App() {
  const t = useTheme();
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [setup, setSetup] = useState(false);
  const [settings, setSettings] = useState(false);
  const open = (e: EventItem | null, fresh = false) => { setSelected(e); setIsNew(fresh); };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        {selected ? <EventDetail key={selected.id} event={selected} isNew={isNew} onBack={() => open(null)} onChanged={(e) => open(e)} />
          : setup ? <SetupEmail onBack={() => setSetup(false)} />
          : settings ? <Settings onBack={() => setSettings(false)} onSetup={() => setSetup(true)} />
          : <Home onOpen={(e) => open(e)} onAdd={(day) => open(blankEvent(day), true)} onSettings={() => setSettings(true)} />}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

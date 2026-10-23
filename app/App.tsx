import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import EventDetail from './src/screens/EventDetail';
import Home from './src/screens/Home';
import SetupEmail from './src/screens/SetupEmail';
import { EventItem } from './src/lib';
import { useTheme } from './src/theme';

export default function App() {
  const t = useTheme();
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [setup, setSetup] = useState(false);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        {selected ? <EventDetail event={selected} onBack={() => setSelected(null)} />
          : setup ? <SetupEmail onBack={() => setSetup(false)} />
          : <Home onOpen={setSelected} onSetup={() => setSetup(true)} />}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

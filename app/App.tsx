import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { clearAccess, getAccess } from './src/access';
import AccessCode from './src/screens/AccessCode';
import EventDetail from './src/screens/EventDetail';
import Home from './src/screens/Home';
import ParentSchedule from './src/screens/ParentSchedule';
import Settings from './src/screens/Settings';
import Sites from './src/screens/Sites';
import SetupEmail from './src/screens/SetupEmail';
import { ADDED_CATEGORY, newEventId } from './src/edits';
import { EventItem, Locked } from './src/lib';
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
  const [schedule, setSchedule] = useState(false);
  const [sitesOpen, setSitesOpen] = useState(false);
  // ok: unlocked. none/revoked: show the access code screen. null: still checking.
  const [access, setAccess] = useState<'ok' | Locked | null>(null);
  useEffect(() => { getAccess().then((a) => setAccess(a ? 'ok' : 'none')); }, []);
  const lockOut = (why: Locked) => { setSelected(null); setSetup(false); setSettings(false); setSchedule(false); setSitesOpen(false); setAccess(why); };
  const open = (e: EventItem | null, fresh = false) => { setSelected(e); setIsNew(fresh); };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        {access === null ? null
          : access !== 'ok' ? <AccessCode revoked={access === 'revoked'} onUnlocked={() => setAccess('ok')} />
          : selected ? <EventDetail key={selected.id} event={selected} isNew={isNew} onBack={() => open(null)} onChanged={(e) => open(e)} />
          : setup ? <SetupEmail onBack={() => setSetup(false)} />
          : sitesOpen ? <Sites onBack={() => setSitesOpen(false)} />
          : schedule ? <ParentSchedule onBack={() => setSchedule(false)} />
          : settings ? <Settings onSchedule={() => setSchedule(true)} onSites={() => setSitesOpen(true)} onBack={() => setSettings(false)} onSetup={() => setSetup(true)} onChangeCode={() => { clearAccess().finally(() => lockOut('none')); }} />
          : <Home onOpen={(e) => open(e)} onAdd={(day) => open(blankEvent(day), true)} onSettings={() => setSettings(true)} onLocked={lockOut} />}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

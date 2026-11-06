import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Override, getEditKey, saveOverride, setEditKey } from '../edits';
import { EventItem, dayKey, endDate, formatTime, startDate } from '../lib';
import { useTheme } from '../theme';

type Form = { title: string; date: string; endDate: string; startTime: string; endTime: string; location: string; description: string };

const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
const fmtClock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Accepts 11/5/2026, 11/5/26 or 2026-11-05. */
function parseDate(s: string): Date | null {
  const t = s.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) return new Date(Number(m[3].length === 2 ? '20' + m[3] : m[3]), Number(m[1]) - 1, Number(m[2]));
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

/** Accepts 6:30 PM, 6pm, 18:30. */
function parseTime(s: string): [number, number] | null {
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  return h < 24 && min < 60 ? [h, min] : null;
}

function toForm(e: EventItem): Form {
  const s0 = startDate(e);
  const e0 = endDate(e);
  const multi = e.allDay && e0.toDateString() !== s0.toDateString();
  return {
    title: e.title,
    date: fmtDate(s0),
    endDate: multi ? fmtDate(e0) : '',
    startTime: e.allDay ? '' : fmtClock(s0),
    endTime: e.allDay ? '' : fmtClock(e0),
    location: e.location ?? '',
    description: e.description ?? '',
  };
}

/** Turns the form into a shared override, or returns an error message. */
function toOverride(f: Form): Override | string {
  const title = f.title.trim();
  if (!title) return 'Please enter a title.';
  const d = parseDate(f.date);
  if (!d) return 'Date should look like 11/5/2026.';
  const ed = f.endDate.trim() ? parseDate(f.endDate) : d;
  if (!ed) return 'End date should look like 11/6/2026.';
  if (ed < d) return 'End date is before the start date.';
  const base = { title, location: f.location.trim() || null, description: f.description.trim() || null };
  if (!f.startTime.trim()) {
    if (f.endTime.trim()) return 'Add a start time too, or clear the end time for an all-day event.';
    return { ...base, allDay: true, start: dayKey(d), end: dayKey(ed) };
  }
  const st = parseTime(f.startTime);
  if (!st) return 'Start time should look like 6:30 PM.';
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), st[0], st[1]);
  let end = new Date(start.getTime() + 60 * 60 * 1000);
  if (f.endTime.trim()) {
    const et = parseTime(f.endTime);
    if (!et) return 'End time should look like 7:30 PM.';
    end = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), et[0], et[1]);
    if (end < start) return 'End time is before the start time.';
  }
  return { ...base, allDay: false, start: start.toISOString(), end: end.toISOString() };
}

export default function EventDetail({ event, isNew = false, onBack, onChanged }: { event: EventItem; isNew?: boolean; onBack: () => void; onChanged: (e: EventItem | null) => void }) {
  const t = useTheme();
  const [mode, setMode] = useState<'view' | 'edit' | 'key'>(isNew ? 'edit' : 'view');
  const [after, setAfter] = useState<'edit' | 'delete' | 'save'>('edit'); // what to do once a key is entered
  const [form, setForm] = useState<Form>(() => toForm(event));
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const editable = event.source === 'email' || event.source === 'manual';

  const s0 = startDate(event);
  const e0 = endDate(event);
  const fmt = (d: Date) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const date = event.allDay && e0.toDateString() !== s0.toDateString() ? `${fmt(s0)} – ${fmt(e0)}` : fmt(s0);
  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: t.sub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 16, marginTop: 2 }}>{value}</Text>
    </View>
  );
  const Btn = ({ label, onPress, color, fill }: { label: string; onPress: () => void; color: string; fill?: boolean }) => (
    <Pressable disabled={busy} onPress={onPress} style={({ pressed }) => [st.btn, { backgroundColor: fill ? color : t.chip, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
      <Text style={{ color: fill ? '#fff' : color, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  const needKey = async (next: 'edit' | 'delete' | 'save') => {
    if (await getEditKey()) return false;
    setAfter(next);
    setMode('key');
    return true;
  };
  const startEdit = async () => {
    if (await needKey('edit')) return;
    setForm(toForm(event));
    setMode('edit');
  };
  const run = async (o: Override, done: () => void) => {
    setBusy(true);
    try {
      await saveOverride(event.id, o, event.title);
      done();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const o = toOverride(form);
    if (typeof o === 'string') return Alert.alert('Check the details', o);
    if (await needKey('save')) return;
    // An added event's entry is the whole event, so it keeps its "added" mark through edits.
    const full = event.source === 'manual' ? { ...o, added: true } : o;
    run(full, () => { setMode('view'); onChanged({ ...event, ...o } as EventItem); });
  };
  const remove = async () => {
    if (await needKey('delete')) return;
    Alert.alert('Delete this event?', `"${event.title}" will be removed for everyone using the app.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run({ deleted: true }, () => onChanged(null)) },
    ]);
  };
  const saveKey = async () => {
    if (!key.trim()) return;
    await setEditKey(key);
    setKey('');
    if (after === 'save') { setMode('edit'); save(); return; }
    setMode('view');
    if (after === 'edit') startEdit(); else remove();
  };

  const Field = ({ label, k, hint, multiline }: { label: string; k: keyof Form; hint?: string; multiline?: boolean }) => (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: t.sub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        value={form[k]}
        onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))}
        placeholder={hint}
        placeholderTextColor={t.sub}
        multiline={multiline}
        style={[st.input, { color: t.text, backgroundColor: t.card, borderColor: t.line, minHeight: multiline ? 80 : undefined }]}
      />
    </View>
  );

  if (mode === 'key') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setMode(after === 'save' ? 'edit' : 'view')}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Back</Text></Pressable>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', marginTop: 12 }}>Editing key</Text>
        <Text style={{ color: t.sub, fontSize: 14, marginTop: 8 }}>
          Changes are shared with everyone using the app, so this phone needs the editing key once. Paste it below.
        </Text>
        <TextInput value={key} onChangeText={setKey} placeholder="github_pat_…" placeholderTextColor={t.sub} autoCapitalize="none" autoCorrect={false} secureTextEntry
          style={[st.input, { color: t.text, backgroundColor: t.card, borderColor: t.line, marginTop: 16 }]} />
        <View style={{ flexDirection: 'row', gap: 10 }}><Btn label="Save key" onPress={saveKey} color={t.accent} fill /></View>
      </ScrollView>
    );
  }

  if (mode === 'edit') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Pressable disabled={busy} onPress={() => (isNew ? onBack() : setMode('view'))}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Cancel</Text></Pressable>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', marginTop: 12 }}>{isNew ? 'Add event' : 'Edit event'}</Text>
        {Field({ label: 'Title', k: 'title' })}
        {Field({ label: 'Date', k: 'date', hint: '11/5/2026' })}
        {Field({ label: 'End date (if more than one day)', k: 'endDate', hint: 'optional' })}
        {Field({ label: 'Start time (blank = all day)', k: 'startTime', hint: '6:30 PM' })}
        {Field({ label: 'End time', k: 'endTime', hint: 'optional' })}
        {Field({ label: 'Location', k: 'location', hint: 'optional' })}
        {Field({ label: 'Details', k: 'description', hint: 'optional', multiline: true })}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' }}>
          <Btn label="Save" onPress={save} color={t.accent} fill />
          {busy ? <ActivityIndicator color={t.accent} style={{ marginTop: 8 }} /> : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }}>
      <Pressable onPress={onBack}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Events</Text></Pressable>
      <Text style={{ color: '#1fa34a', fontSize: 26, fontWeight: '800', marginTop: 12 }}>{event.title}</Text>
      <Row label="Date" value={date} />
      <Row label="Time" value={formatTime(event)} />
      {event.category ? <Row label="Calendar" value={event.category} /> : null}
      {event.location ? (
        <View>
          <Row label="Location" value={event.location} />
          <Pressable onPress={() => Linking.openURL('http://maps.apple.com/?q=' + encodeURIComponent(event.location!))} style={[st.btn, { backgroundColor: t.chip }]}>
            <Text style={{ color: t.accent, fontWeight: '600' }}>Open in Maps</Text>
          </Pressable>
        </View>
      ) : null}
      {event.description ? <Row label="Details" value={event.description} /> : null}
      <Text style={{ color: t.sub, fontSize: 12, marginTop: 24 }}>
        {event.source === 'manual' ? 'Added in the app.' : event.source === 'plan' ? 'From the parenting schedule in Settings.' : event.category === 'Parent' ? 'From a Parent Schedule email.' : event.source === 'email' ? 'Found in a Shiloh email.' : event.source === 'calendar' ? `From your ${event.category ?? 'phone'} calendar. Change it in that app.` : event.source === 'site' ? `From the web site "${event.category}" in Settings.` : 'From the Shiloh website calendar.'}
      </Text>
      {editable ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' }}>
          <Btn label="Edit" onPress={startEdit} color={t.accent} />
          <Btn label="Delete" onPress={remove} color="#ff3b30" />
          {busy ? <ActivityIndicator color={t.accent} style={{ marginTop: 8 }} /> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
const st = StyleSheet.create({
  btn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginTop: 4 },
});

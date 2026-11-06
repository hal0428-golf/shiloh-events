import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SOURCES_PATH } from '../config';
import { getEditKey, readRepoJson, setEditKey, writeRepoJson } from '../edits';
import { useTheme } from '../theme';

/** A web site to read events from. Keywords (comma separated) keep only matching events. */
export type Site = { name: string; url: string; keywords: string };

const blank: Site = { name: '', url: '', keywords: '' };

/** Settings › Web sites: pages or calendar links the Update events job reads every few hours. */
export default function Sites({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const [sites, setSites] = useState<Site[] | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [key, setKey] = useState('');
  const [editing, setEditing] = useState<number | null>(null); // index, or -1 for a new site
  const [form, setForm] = useState<Site>(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    const k = await getEditKey().catch(() => null);
    setHasKey(!!k);
    if (!k) return;
    try {
      const { data } = await readRepoJson<Site[]>(SOURCES_PATH, k);
      setSites(Array.isArray(data) ? data : []);
      setErr('');
    } catch (e: any) {
      setErr(`Couldn't load the list (${e?.message ?? 'offline'}).`);
    }
  };
  useEffect(() => { load(); }, []);

  const saveKey = async () => {
    if (!key.trim()) return;
    await setEditKey(key);
    setKey('');
    load();
  };

  const write = async (next: Site[], what: string) => {
    const k = await getEditKey();
    if (!k) return;
    setBusy(true);
    try {
      await writeRepoJson(SOURCES_PATH, next, what, k);
      setSites(next);
      setEditing(null);
      Alert.alert('Saved', 'Events from web sites show up after the next Update events run (every 3 hours, or a few minutes after this save).');
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    let url = form.url.trim();
    if (url && !/^(https?|webcal):\/\//i.test(url)) url = 'https://' + url;
    if (!/^(https?|webcal):\/\/[^\s.]+\.[^\s]+$/i.test(url)) return Alert.alert('Check the address', 'Enter a web address like https://shilohchristian.org/athletics');
    const site: Site = { name: form.name.trim() || url.replace(/^\w+:\/\//, '').split('/')[0], url, keywords: form.keywords.trim() };
    const list = [...(sites ?? [])];
    if (editing === -1) list.push(site);
    else if (editing !== null) list[editing] = site;
    write(list, editing === -1 ? `Add web site ${site.name}` : `Update web site ${site.name}`);
  };

  const remove = (i: number) => {
    const s = sites![i];
    Alert.alert(`Remove ${s.name}?`, 'Its events will disappear after the next update.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => write(sites!.filter((_, j) => j !== i), `Remove web site ${s.name}`) },
    ]);
  };

  const open = (i: number) => { setEditing(i); setForm(i === -1 ? blank : sites![i]); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Settings</Text></Pressable>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginTop: 12 }}>Web sites</Text>
      <Text style={{ color: t.sub, fontSize: 14, marginTop: 4 }}>
        Add web pages with event information, like a team schedule or a league calendar. They're checked every few hours, and their events show on the calendar in teal. A calendar link (.ics or webcal://) works best.
      </Text>

      {hasKey === false ? (
        <View style={[st.box, { backgroundColor: t.card, borderColor: t.line }]}>
          <Text style={{ color: t.text, fontSize: 15 }}>Adding web sites needs the editing key. Paste it once:</Text>
          <TextInput value={key} onChangeText={setKey} placeholder="github_pat_…" placeholderTextColor={t.sub} autoCapitalize="none" autoCorrect={false} secureTextEntry
            style={[st.input, { color: t.text, borderColor: t.line }]} />
          <Pressable onPress={saveKey} style={[st.btn, { backgroundColor: t.accent }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Save key</Text></Pressable>
        </View>
      ) : null}
      {err ? <Text style={{ color: t.email, fontSize: 13, marginTop: 10 }}>{err}</Text> : null}
      {hasKey && !sites && !err ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}

      {sites ? (
        <View style={[st.list, { backgroundColor: t.card, borderColor: t.line }]}>
          {sites.length === 0 ? <Text style={{ color: t.sub, fontSize: 15, padding: 14 }}>No web sites yet.</Text> : null}
          {sites.map((s, i) => (
            <Pressable key={i} onPress={() => open(i)} style={[st.item, { borderColor: t.line }]}>
              <View style={[st.dot, { backgroundColor: t.site }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{s.name}</Text>
                <Text numberOfLines={1} style={{ color: t.sub, fontSize: 12 }}>{s.url}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }}>{s.keywords ? `Keywords: ${s.keywords}` : 'All events'}</Text>
              </View>
              <Text style={{ color: t.sub, fontSize: 18 }}>›</Text>
            </Pressable>
          ))}
          {editing === null ? (
            <Pressable onPress={() => open(-1)} style={st.item}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>+ Add a web site</Text></Pressable>
          ) : null}
        </View>
      ) : null}

      {editing !== null ? (
        <View style={[st.box, { backgroundColor: t.card, borderColor: t.line }]}>
          <Text style={{ color: t.text, fontSize: 17, fontWeight: '800' }}>{editing === -1 ? 'New web site' : 'Edit web site'}</Text>
          <Text style={[st.label, { color: t.sub }]}>NAME</Text>
          <TextInput value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="West 5th Gold basketball" placeholderTextColor={t.sub}
            autoCapitalize="words" style={[st.input, { color: t.text, borderColor: t.line }]} />
          <Text style={[st.label, { color: t.sub }]}>WEB ADDRESS</Text>
          <TextInput value={form.url} onChangeText={(url) => setForm({ ...form, url })} placeholder="https://…" placeholderTextColor={t.sub}
            autoCapitalize="none" autoCorrect={false} keyboardType="url" style={[st.input, { color: t.text, borderColor: t.line }]} />
          <Text style={[st.label, { color: t.sub }]}>KEYWORDS</Text>
          <TextInput value={form.keywords} onChangeText={(keywords) => setForm({ ...form, keywords })} placeholder="5th, gold, Shiloh West" placeholderTextColor={t.sub}
            autoCapitalize="none" style={[st.input, { color: t.text, borderColor: t.line }]} />
          <Text style={{ color: t.sub, fontSize: 12, marginTop: 6 }}>Separate with commas. Only events that mention at least one keyword are added. Leave empty to add every event.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable onPress={() => setEditing(null)} style={[st.btn, { flex: 1, backgroundColor: t.chip, marginTop: 0 }]}><Text style={{ color: t.text, fontWeight: '700' }}>Cancel</Text></Pressable>
            <Pressable onPress={submit} disabled={busy} style={[st.btn, { flex: 1, backgroundColor: t.accent, marginTop: 0 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>}
            </Pressable>
          </View>
          {editing >= 0 ? (
            <Pressable onPress={() => remove(editing)} style={{ alignSelf: 'center', marginTop: 14 }}><Text style={{ color: '#ff3b30', fontSize: 15, fontWeight: '600' }}>Remove this web site</Text></Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  box: { marginTop: 14, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  list: { marginTop: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 12 },
  input: { marginTop: 6, fontSize: 16, padding: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  btn: { marginTop: 10, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});

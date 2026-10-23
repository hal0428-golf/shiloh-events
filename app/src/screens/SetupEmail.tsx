import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FORWARD_ADDRESS } from '../config';
import { useTheme } from '../theme';

const GUIDES: Record<string, string[]> = {
  Gmail: [
    'Open Gmail on a computer or in Safari (filters can’t be made in the iPhone app).',
    'Settings (gear) › See all settings › Forwarding and POP/IMAP › Add a forwarding address. Paste the address above.',
    'Gmail emails a confirmation code to that address. Ask Dad to read it to you, then enter it in Gmail.',
    'Settings › Filters and Blocked Addresses › Create a new filter. In From, type shilohsaints.org. Add any other Shiloh senders with OR.',
    'Click Create filter, tick “Forward it to” and pick the address, then Create filter.',
  ],
  Outlook: [
    'Open Outlook on the web › Settings (gear) › Mail › Rules › Add new rule.',
    'Condition: From contains shilohsaints.org.',
    'Action: Forward to, and paste the address above. Save.',
  ],
  iCloud: [
    'Open icloud.com/mail › gear icon › Rules › Add a Rule.',
    'If a message is from (contains) shilohsaints.org.',
    'Then forward to the address above. Done.',
  ],
};

export default function SetupEmail({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const [prov, setProv] = useState('Gmail');
  const [copied, setCopied] = useState(false);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Pressable onPress={onBack}><Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>‹ Events</Text></Pressable>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginTop: 12 }}>Connect your email</Text>
      <Text style={{ color: t.sub, fontSize: 15, marginTop: 8 }}>
        Forward your Shiloh emails to the address below and any events in them will show up here. The app never sees your inbox or password; only the emails you forward are read.
      </Text>
      <View style={[st.box, { backgroundColor: t.card, borderColor: t.line }]}>
        <Text selectable style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{FORWARD_ADDRESS}</Text>
        <Pressable
          onPress={async () => { await Clipboard.setStringAsync(FORWARD_ADDRESS); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={[st.copy, { backgroundColor: t.chip }]}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {Object.keys(GUIDES).map((p) => (
          <Pressable key={p} onPress={() => setProv(p)} style={[st.tab, { backgroundColor: p === prov ? t.accent : t.chip }]}>
            <Text style={{ color: p === prov ? (t.bg === '#0d1117' ? '#0d1117' : '#fff') : t.text, fontWeight: '600' }}>{p}</Text>
          </Pressable>
        ))}
      </View>
      {GUIDES[prov].map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', marginTop: 14 }}>
          <Text style={{ color: t.accent, fontWeight: '800', width: 24 }}>{i + 1}.</Text>
          <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>{step}</Text>
        </View>
      ))}
      <Text style={{ color: t.sub, fontSize: 13, marginTop: 24 }}>New events can take a few hours to appear after an email is forwarded.</Text>
    </ScrollView>
  );
}
const st = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  copy: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
});

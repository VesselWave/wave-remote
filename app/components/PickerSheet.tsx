import { request } from '../lib/transport';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, List, Text } from 'react-native-paper';
import { native, type TvInput } from '../../modules/wave-remote';
import { commands, errorMessage } from '../lib/remote';
import { palette, radius } from '../theme';
import { Sheet, SHEET_END_PADDING } from './Sheet';
import { useScrollCues } from './ScrollFrame';

type Choice = { id: string; title: string; description?: string };
const inputStatus = (input: TvInput) => input.connected === false ? 'Nothing connected'
  : input.connected ? (input.hdmiSignalExist === false ? 'Connected, no signal' : 'Connected') : undefined;
/** TV inputs. Apps have their own launcher, `AppsSheet`. */
export function PickerSheet({ onClose, report, ready, connecting }: {
  onClose: () => void; report: (message: string) => void; ready: boolean; connecting: boolean;
}) {
  const [items, setItems] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(ready);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [previousReady, setPreviousReady] = useState(ready);
  if (previousReady !== ready) {
    setPreviousReady(ready);
    setActing(null);
    setLoading(ready);
    setError('');
  }
  const generation = useRef(0);
  const activeAction = useRef(false);
  const scroll = useScrollCues(SHEET_END_PADDING);
  useEffect(() => {
    const token = ++generation.current;
    // A disconnect invalidates the old action's finally block too. Release its
    // latch here so a recovered connection can accept a new selection.
    activeAction.current = false;
    if (!ready) return;
    void request(commands.inputs).then((response) => {
      if (generation.current !== token) return;
      const choices: Choice[] = (response.devices || []).filter((input: TvInput) => !!input.id).map((input) => ({ id: input.id, title: input.label || input.id, description: inputStatus(input) }));
      setItems(choices.sort((a, b) => a.title.localeCompare(b.title)));
    }).catch((issue: unknown) => { if (generation.current === token) setError(errorMessage(issue)); })
      .finally(() => { if (generation.current === token) setLoading(false); });
    return () => { generation.current = token + 1; };
  }, [retry, ready]);
  const choose = async (item: Choice) => {
    if (activeAction.current || !ready) return;
    activeAction.current = true;
    const token = generation.current;
    setActing(item.id);
    try {
      await native!.request('ssap://tv/switchInput', { inputId: item.id });
      if (token === generation.current) onClose();
    } catch (issue) { if (token === generation.current) report(errorMessage(issue)); }
    finally { if (token === generation.current) { setActing(null); activeAction.current = false; } }
  };
  return <Sheet open onClose={onClose} title="Inputs" subtitle="Choose what’s on your screen.">
    {(heading) => <View {...scroll.frameProps} style={styles.scroll}><FlatList contentContainerStyle={scroll.contentStyle} {...scroll.props} style={styles.scroll} data={ready && !loading && !error ? items : []} keyExtractor={(item) => item.id} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<>{heading}</>}
      renderItem={({ item }) =>
        <List.Item title={item.title} titleNumberOfLines={2} description={item.description} left={(props) => <List.Icon {...props} icon="application-import" />} right={(props) => acting === item.id ? <ActivityIndicator size={20} style={styles.progress} /> : <List.Icon {...props} icon="chevron-right" />} onPress={() => void choose(item)} disabled={!!acting || !ready} style={styles.item} />
      } ListEmptyComponent={!ready && connecting ? <View style={styles.empty}><ActivityIndicator /><Text style={styles.secondary}>Reconnecting to your TV…</Text></View> : !ready ? <View style={styles.empty}><Text>Your TV disconnected. Close this menu and reconnect.</Text></View> : loading ? <View style={styles.empty}><ActivityIndicator /><Text style={styles.secondary}>Loading from your TV…</Text></View> : error ? <View style={styles.empty}><Icon source="wifi-alert" size={36} color={palette.muted} /><Text variant="bodyLarge" style={styles.center}>{error}</Text><Button icon="refresh" onPress={() => { setError(''); setLoading(true); setRetry((value) => value + 1); }} disabled={!ready}>Try again</Button></View> : <View style={styles.empty}><Icon source="application-import" size={40} color={palette.muted} /><Text variant="titleMedium">No inputs reported</Text><Text style={styles.secondary}>Your TV returned an empty list.</Text></View>} />{scroll.cues}</View>}
  </Sheet>;
}
const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  item: { minHeight: 72, borderRadius: radius.md, marginHorizontal: 12 }, empty: { alignItems: 'center', padding: 32, gap: 16 }, secondary: { color: palette.muted, textAlign: 'center' }, center: { textAlign: 'center' }, progress: { margin: 16 },
});

import { useTranslate } from '../i18n/context';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, List, TextInput } from 'react-native-paper';
import { native, type RemoteState, type SavedTv } from '../../modules/wave-remote';
import { palette, radius } from '../theme';
import { Sheet } from './Sheet';

export function TvSheet({ state, open, onClose, onAdd, run }: {
  state: RemoteState; open: boolean; onClose: () => void; onAdd: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const t = useTranslate();
  const [editing, setEditing] = useState<SavedTv | null>(null);
  const [label, setLabel] = useState('');
  const close = () => { setEditing(null); onClose(); };
  const edit = (tv: SavedTv) => { setLabel(tv.label || ''); setEditing(tv); };
  const save = (host: string, value: string) => { void run(() => native!.rename(host, value)).then((success) => { if (success) setEditing(null); }); };
  if (editing) {
    const own = editing.tvName || 'LG TV';
    return <Sheet open={open} onClose={close} title={t('Rename TV')} subtitle={editing.host}>
      <View style={styles.form}>
        <TextInput label={t('Name on this phone')} placeholder={own} mode="outlined" value={label} onChangeText={setLabel} maxLength={40} autoFocus returnKeyType="done" onSubmitEditing={() => save(editing.host, label)} />
        <HelperText type="info">{t('Leave empty to use the TV’s own name, {name}.', { name: own })}</HelperText>
        <View style={styles.actions}>
          <Button onPress={() => setEditing(null)}>{t('Cancel')}</Button>
          <Button mode="contained" onPress={() => save(editing.host, label)}>{t('Save')}</Button>
        </View>
      </View>
    </Sheet>;
  }
  return <Sheet open={open} onClose={close} title={t('Your TVs')} subtitle={t('Pairings for every TV stay on this phone.')}>
    <View style={styles.content}>
      {state.tvs.map((tv) => {
        const current = tv.host === state.host;
        return <List.Item key={tv.host} title={tv.name || 'LG TV'} description={tv.paired ? tv.host : `${tv.host} · ${t('Not paired yet')}`}
          titleNumberOfLines={2} accessibilityState={{ selected: current }}
          accessibilityLabel={`${tv.name || 'LG TV'}, ${tv.host}${tv.paired ? '' : t(', not paired yet')}${current ? t(', current TV') : ''}`}
          left={(props) => <List.Icon {...props} icon="television" color={current ? palette.accentFg : palette.muted} />}
          right={() => <View style={styles.trailing}>
            {current ? <List.Icon icon="check" color={palette.accentFg} /> : null}
            <IconButton icon="pencil-outline" accessibilityLabel={t('Rename {name}', { name: tv.name || 'LG TV' })} onPress={() => edit(tv)} style={styles.rename} />
          </View>}
          onPress={() => {
            if (current) { close(); return; }
            void run(() => native!.connect(tv.host, tv.name || 'LG TV', null)).then((success) => { if (success) close(); });
          }} style={[styles.item, current && styles.current]} />;
      })}
      <List.Item title={t('Add a TV')} accessibilityLabel={t('Add a TV')} description={t('Find another TV or enter its IP address')} left={(props) => <List.Icon {...props} icon="plus" />} onPress={onAdd} style={styles.item} />
    </View>
  </Sheet>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 12, gap: 4 },
  item: { paddingHorizontal: 12, minHeight: 72, borderRadius: radius.md }, current: { backgroundColor: palette.raised },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 4 }, rename: { width: 48, height: 48, margin: 0 },
  form: { paddingHorizontal: 24, gap: 4 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
});

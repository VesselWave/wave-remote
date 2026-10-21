import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Divider, Icon, List, RadioButton, SegmentedButtons, Text } from 'react-native-paper';
import { native, type RemoteState } from '../../modules/wave-remote';
import { connectionLabel } from '../lib/remote';
import { palette } from '../theme';
import { Sheet } from './Sheet';

export function SettingsSheet({ state, open, onClose, run }: {
  state: RemoteState; open: boolean; onClose: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [confirmForget, setConfirmForget] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stackedChoices = (Math.min(width, 600) - 48) / fontScale < 260;
  const close = () => { setConfirmForget(false); onClose(); };
  return <Sheet open={open} onClose={close} title={confirmForget ? 'Forget this TV?' : 'Remote settings'} subtitle={confirmForget ? undefined : 'Make this remote feel right for you.'}>
    {confirmForget ? <View style={styles.confirm}>
      <Text variant="bodyLarge">This removes the saved pairing for {state.name || 'your TV'}. You’ll need to approve a new connection on the TV to use it again.</Text>
      <View style={styles.actions}><Button onPress={() => setConfirmForget(false)}>Keep TV</Button>
        <Button mode="contained" icon="link-off" buttonColor="#FFB4AB" textColor="#690005" onPress={() => { void run(() => native!.forget()).then((success) => { if (success) close(); }); }}>Forget TV</Button></View>
    </View> : <View style={styles.content}>
      <View style={styles.device}><Icon source="television" size={28} color="#ADC6FF" /><View style={styles.deviceInfo}>
        <Text variant="titleMedium">{state.name || 'LG TV'}</Text><Text variant="bodyMedium" style={styles.secondary}>{state.host}</Text>
        <Text variant="bodySmall" style={styles.secondary}>{connectionLabel(state)}</Text>
      </View></View>
      <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">Touchpad scrolling</Text>
      <Text variant="bodyMedium" style={styles.explanation}>Natural moves content along with your fingers.</Text>
      {([['Right-edge strip', 'naturalEdge'], ['Two fingers', 'naturalTwoFinger']] as const).map(([group, setting]) =>
        <View key={setting} style={styles.scrollSetting}>
          <Text variant="bodyLarge">{group}</Text>
          {stackedChoices ? <RadioButton.Group value={state[setting] ? 'natural' : 'traditional'}
            onValueChange={(value) => { const next = { ...state, [setting]: value === 'natural' }; void run(() => native!.preferences(state.touchpad, next.naturalEdge, next.naturalTwoFinger)); }}>
            <RadioButton.Item value="traditional" label="Traditional" accessibilityLabel={`${group}: Traditional`} style={styles.choice} />
            <RadioButton.Item value="natural" label="Natural" accessibilityLabel={`${group}: Natural`} style={styles.choice} />
          </RadioButton.Group> : <SegmentedButtons value={state[setting] ? 'natural' : 'traditional'} density="small"
            onValueChange={(value) => { const next = { ...state, [setting]: value === 'natural' }; void run(() => native!.preferences(state.touchpad, next.naturalEdge, next.naturalTwoFinger)); }}
            buttons={[{ value: 'traditional', label: 'Traditional', showSelectedCheck: true, accessibilityLabel: `${group}: Traditional` }, { value: 'natural', label: 'Natural', showSelectedCheck: true, accessibilityLabel: `${group}: Natural` }]} />}
        </View>)}
      <Divider style={styles.divider} />
      <List.Item title="Reconnect" description="Start a fresh connection to this TV" left={(props) => <List.Icon {...props} icon="refresh" />} onPress={() => { void run(() => native!.reconnect()).then((success) => { if (success) close(); }); }} style={styles.action} />
      <List.Item title="Forget this TV" titleStyle={{ color: '#FFB4AB' }} description="Remove its saved pairing" left={(props) => <List.Icon {...props} color="#FFB4AB" icon="link-off" />} onPress={() => setConfirmForget(true)} style={styles.action} />
    </View>}
  </Sheet>;
}
const styles = StyleSheet.create({
  content: { paddingBottom: 8 }, device: { flexDirection: 'row', gap: 16, padding: 20, marginHorizontal: 24, borderRadius: 16, backgroundColor: palette.raised },
  deviceInfo: { flex: 1, gap: 4 }, secondary: { color: palette.muted }, sectionTitle: { marginTop: 28, marginBottom: 8, marginHorizontal: 24, color: '#ADC6FF' },
  explanation: { marginHorizontal: 24, color: palette.muted, marginBottom: 8 }, scrollSetting: { marginHorizontal: 24, marginTop: 12, gap: 8 },
  divider: { marginHorizontal: 24, marginVertical: 20 }, action: { paddingHorizontal: 12, minHeight: 80 },
  confirm: { paddingHorizontal: 24, gap: 24 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }, choice: { paddingHorizontal: 0 },
});

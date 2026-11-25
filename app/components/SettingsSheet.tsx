import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Divider, Icon, List, RadioButton, SegmentedButtons, Text } from 'react-native-paper';
import { native, type RemoteState } from '../../modules/wave-remote';
import { askForNotifications } from '../hooks/useRemote';
import { connectionLabel } from '../lib/remote';
import { palette, radius } from '../theme';
import { Sheet } from './Sheet';
import { Toggle } from './Toggle';

// A switch shows the new value as soon as it is pressed and keeps it while the native side saves it;
// a failed save puts it back. Every state event then agrees with it, so it moves exactly once.
function useSwitch(saved: boolean, save: (next: boolean) => Promise<boolean>) {
  const [shown, setShown] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) { setLastSaved(saved); setShown(saved); }
  const toggle = () => { const next = !shown; setShown(next); void save(next).then((success) => { if (!success) setShown(!next); }); };
  return [shown, toggle] as const;
}

export function SettingsSheet({ state, open, onClose, run }: {
  state: RemoteState; open: boolean; onClose: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [confirmForget, setConfirmForget] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stackedChoices = (Math.min(width, 600) - 48) / fontScale < 260;
  const close = () => { setConfirmForget(false); onClose(); };
  const [background, toggleBackground] = useSwitch(state.background, (next) => run(() => native!.setBackground(next)));
  const allowNotifications = () => { void run(async () => { if (!(await askForNotifications())) await native!.openNotificationSettings(); }); };
  return <Sheet open={open} onClose={close} title={confirmForget ? 'Forget this TV?' : 'Remote settings'} subtitle={confirmForget ? undefined : 'Make this remote feel right for you.'}>
    {confirmForget ? <View style={styles.confirm}>
      <Text variant="bodyLarge">This removes the saved pairing for {state.name || 'your TV'}. You’ll need to approve a new connection on the TV to use it again.</Text>
      <View style={styles.actions}><Button onPress={() => setConfirmForget(false)}>Keep TV</Button>
        <Button mode="contained" icon="link-off" buttonColor={palette.danger} textColor="#FFFFFF" onPress={() => { void run(() => native!.forget()).then((success) => { if (success) close(); }); }}>Forget TV</Button></View>
    </View> : <View>
      <View style={styles.device}><Icon source="television" size={28} color={palette.accentFg} /><View style={styles.deviceInfo}>
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
      <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">Background</Text>
      <List.Item title="Stay connected" descriptionNumberOfLines={3}
        description="Keeps the TV connected while the screen is off or you’re in another app, with volume, play and pause in a notification"
        accessibilityRole="switch" accessibilityState={{ checked: background }} onPress={toggleBackground}
        right={() => <Toggle value={background} />} style={styles.setting} />
      {/* Always shown: whether Android may cut the background connection is worth knowing before turning it on. */}
      <Callout title="Unrestricted battery use" granted={!state.batteryRestricted}
        icon={state.batteryRestricted ? 'battery-alert-variant-outline' : 'battery-check-outline'}
        description={state.batteryRestricted ? 'Battery optimization may close the connection while the screen is off'
          : 'Battery optimization won’t close the connection'}
        onAllow={() => { void run(() => native!.allowBackground(true)); }} />
      {/* Staying connected works without notifications; they only make the controls visible. */}
      {background && !state.notifications ? <Callout title="Notifications are off" granted={false} icon="bell-off-outline"
        description="Staying connected still works, but volume, play and pause can’t appear" onAllow={allowNotifications} /> : null}
      <Divider style={styles.divider} />
      <List.Item title="Reconnect" description="Start a fresh connection to this TV" left={(props) => <List.Icon {...props} icon="refresh" />} onPress={() => { void run(() => native!.reconnect()).then((success) => { if (success) close(); }); }} style={styles.action} />
      <List.Item title="Forget this TV" titleStyle={{ color: palette.danger }} description="Remove its saved pairing" left={(props) => <List.Icon {...props} color={palette.danger} icon="link-off" />} onPress={() => setConfirmForget(true)} style={styles.action} />
    </View>}
  </Sheet>;
}
// A blue card for a permission the background connection uses: Allow while it's missing, a check once granted.
function Callout({ title, description, icon, granted, onAllow }: { title: string; description: string; icon: string; granted: boolean; onAllow: () => void }) {
  return <View style={styles.callout}>
    <List.Item title={title} description={description} descriptionNumberOfLines={3}
      left={(props) => <List.Icon {...props} color={palette.accentFg} icon={icon} />}
      right={() => granted ? <View style={styles.granted}><Icon source="check-circle" size={24} color={palette.accentFg} /></View>
        : <Text variant="labelLarge" style={styles.allow}>Allow</Text>}
      accessibilityRole={granted ? undefined : 'button'} onPress={granted ? undefined : onAllow} style={styles.calloutItem} />
  </View>;
}
const styles = StyleSheet.create({
  device: { flexDirection: 'row', gap: 16, padding: 20, marginHorizontal: 24, borderRadius: radius.md, backgroundColor: palette.raised },
  deviceInfo: { flex: 1, gap: 4 }, secondary: { color: palette.muted }, sectionTitle: { marginTop: 28, marginBottom: 8, marginHorizontal: 24, color: palette.accentFg },
  explanation: { marginHorizontal: 24, color: palette.muted, marginBottom: 8 }, scrollSetting: { marginHorizontal: 24, marginTop: 12, gap: 8 },
  divider: { marginHorizontal: 24, marginVertical: 20 }, setting: { paddingHorizontal: 12 },
  callout: { marginHorizontal: 24, marginTop: 12, borderRadius: radius.md, backgroundColor: palette.accentSoft, overflow: 'hidden' },
  calloutItem: { paddingLeft: 8, paddingRight: 16, paddingVertical: 12 },
  allow: { color: palette.accentFg, alignSelf: 'center', marginLeft: 12 }, granted: { alignSelf: 'center', marginLeft: 12 }, action: { paddingHorizontal: 12, minHeight: 80 },
  confirm: { paddingHorizontal: 24, gap: 24 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }, choice: { paddingHorizontal: 0 },
});

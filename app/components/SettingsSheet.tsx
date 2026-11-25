import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Divider, Icon, List, RadioButton, SegmentedButtons, Switch, Text } from 'react-native-paper';
import { native, type RemoteState } from '../../modules/wave-remote';
import { askForNotifications } from '../hooks/useRemote';
import { connectionLabel } from '../lib/remote';
import { palette, radius } from '../theme';
import { Sheet } from './Sheet';

export function SettingsSheet({ state, open, onClose, run }: {
  state: RemoteState; open: boolean; onClose: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [confirmForget, setConfirmForget] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stackedChoices = (Math.min(width, 600) - 48) / fontScale < 260;
  const close = () => { setConfirmForget(false); onClose(); };
  const toggleBackground = () => { void run(() => native!.setBackground(!state.background)); };
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
      <List.Item title="Stay connected" description="Keeps the TV connected while the screen is off or you’re in another app" descriptionNumberOfLines={3}
        accessibilityRole="switch" accessibilityState={{ checked: state.background }} onPress={toggleBackground}
        right={() => <Switch value={state.background} onValueChange={toggleBackground} importantForAccessibility="no" />} style={styles.setting} />
      {/* Separate from staying connected: the connection works without either, so each says what it adds. */}
      {state.background ? <>
        <List.Item title="Notification controls" descriptionNumberOfLines={3}
          description={state.notifications ? 'Volume, play and pause in a notification. Optional: staying connected doesn’t need it'
            : 'Staying connected still works; allow notifications to add volume, play and pause'}
          left={(props) => <List.Icon {...props} icon={state.notifications ? 'bell-outline' : 'bell-off-outline'} />}
          right={() => <Text variant="labelLarge" style={state.notifications ? styles.granted : styles.allow}>{state.notifications ? 'On' : 'Allow'}</Text>}
          onPress={state.notifications ? () => { void run(() => native!.openNotificationSettings()); } : allowNotifications} style={styles.setting} />
        <List.Item title="Unrestricted battery use" descriptionNumberOfLines={3}
          description={state.batteryRestricted ? 'Battery optimization may close the connection while the screen is off'
            : 'Battery optimization won’t close the connection'}
          left={(props) => <List.Icon {...props} icon={state.batteryRestricted ? 'battery-alert-variant-outline' : 'battery-check-outline'} />}
          right={() => <Text variant="labelLarge" style={state.batteryRestricted ? styles.allow : styles.granted}>{state.batteryRestricted ? 'Allow' : 'On'}</Text>}
          onPress={state.batteryRestricted ? () => { void run(() => native!.allowBackground(true)); } : undefined} style={styles.setting} />
      </> : null}
      <Divider style={styles.divider} />
      <List.Item title="Reconnect" description="Start a fresh connection to this TV" left={(props) => <List.Icon {...props} icon="refresh" />} onPress={() => { void run(() => native!.reconnect()).then((success) => { if (success) close(); }); }} style={styles.action} />
      <List.Item title="Forget this TV" titleStyle={{ color: palette.danger }} description="Remove its saved pairing" left={(props) => <List.Icon {...props} color={palette.danger} icon="link-off" />} onPress={() => setConfirmForget(true)} style={styles.action} />
    </View>}
  </Sheet>;
}
const styles = StyleSheet.create({
  device: { flexDirection: 'row', gap: 16, padding: 20, marginHorizontal: 24, borderRadius: radius.md, backgroundColor: palette.raised },
  deviceInfo: { flex: 1, gap: 4 }, secondary: { color: palette.muted }, sectionTitle: { marginTop: 28, marginBottom: 8, marginHorizontal: 24, color: palette.accentFg },
  explanation: { marginHorizontal: 24, color: palette.muted, marginBottom: 8 }, scrollSetting: { marginHorizontal: 24, marginTop: 12, gap: 8 },
  divider: { marginHorizontal: 24, marginVertical: 20 }, setting: { paddingHorizontal: 12 },
  allow: { color: palette.accentFg, alignSelf: 'center', marginLeft: 12 }, granted: { color: palette.muted, alignSelf: 'center', marginLeft: 12 }, action: { paddingHorizontal: 12, minHeight: 80 },
  confirm: { paddingHorizontal: 24, gap: 24 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }, choice: { paddingHorizontal: 0 },
});

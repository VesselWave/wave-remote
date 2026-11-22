import { useTranslate } from '../i18n/context';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Divider, Icon, List, RadioButton, SegmentedButtons, Text } from 'react-native-paper';
import { native, type RemoteState } from '../../modules/wave-remote';
import { connectionLabel } from '../lib/remote';
import { palette, radius } from '../theme';
import { Sheet } from './Sheet';

export function SettingsSheet({ state, open, onClose, run }: {
  state: RemoteState; open: boolean; onClose: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const t = useTranslate();
  const [confirmForget, setConfirmForget] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  // Leave room for both translated labels, the selection mark and button padding.
  const choiceWidth = Math.max(130, Math.max(t('Natural').length, t('Traditional').length) * 9 + 44);
  const stackedChoices = (Math.min(width, 600) - 48) / fontScale < 2 * choiceWidth;
  const close = () => { setConfirmForget(false); onClose(); };
  return <Sheet open={open} onClose={close} title={confirmForget ? t('Forget this TV?') : t('Remote settings')} subtitle={confirmForget ? undefined : t('Make this remote feel right for you.')}>
    {confirmForget ? <View style={styles.confirm}>
      <Text variant="bodyLarge">{t('This removes the saved pairing for {name}. You’ll need to approve a new connection on the TV to use it again.', { name: state.name || t('your TV') })}</Text>
      <View style={styles.actions}><Button onPress={() => setConfirmForget(false)}>{t('Keep TV')}</Button>
        <Button mode="contained" icon="link-off" buttonColor={palette.danger} textColor="#FFFFFF" onPress={() => { void run(() => native!.forget()).then((success) => { if (success) close(); }); }}>{t('Forget TV')}</Button></View>
    </View> : <View>
      <View style={styles.device}><Icon source="television" size={28} color={palette.accentFg} /><View style={styles.deviceInfo}>
        <Text variant="titleMedium">{state.name || 'LG TV'}</Text><Text variant="bodyMedium" style={styles.secondary}>{state.host}</Text>
        <Text variant="bodySmall" style={styles.secondary}>{connectionLabel(state, t)}</Text>
      </View></View>
      <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">{t('Touchpad scrolling')}</Text>
      <Text variant="bodyMedium" style={styles.explanation}>{t('Natural moves content along with your fingers.')}</Text>
      {([[t('Right-edge strip'), 'naturalEdge'], [t('Two fingers'), 'naturalTwoFinger']] as const).map(([group, setting]) =>
        <View key={setting} style={styles.scrollSetting}>
          <Text variant="bodyLarge">{group}</Text>
          {stackedChoices ? <RadioButton.Group value={state[setting] ? 'natural' : 'traditional'}
            onValueChange={(value) => { const next = { ...state, [setting]: value === 'natural' }; void run(() => native!.preferences(state.touchpad, next.naturalEdge, next.naturalTwoFinger)); }}>
            <RadioButton.Item value="traditional" label={t('Traditional')} accessibilityLabel={`${group}: ${t('Traditional')}`} style={styles.choice} />
            <RadioButton.Item value="natural" label={t('Natural')} accessibilityLabel={`${group}: ${t('Natural')}`} style={styles.choice} />
          </RadioButton.Group> : <SegmentedButtons value={state[setting] ? 'natural' : 'traditional'} density="small"
            onValueChange={(value) => { const next = { ...state, [setting]: value === 'natural' }; void run(() => native!.preferences(state.touchpad, next.naturalEdge, next.naturalTwoFinger)); }}
            buttons={[{ value: 'traditional', label: t('Traditional'), showSelectedCheck: true, accessibilityLabel: `${group}: ${t('Traditional')}` }, { value: 'natural', label: t('Natural'), showSelectedCheck: true, accessibilityLabel: `${group}: ${t('Natural')}` }]} />}
        </View>)}
      <Divider style={styles.divider} />
      <List.Item title={t('Reconnect')} description={t('Start a fresh connection to this TV')} left={(props) => <List.Icon {...props} icon="refresh" />} onPress={() => { void run(() => native!.reconnect()).then((success) => { if (success) close(); }); }} style={styles.action} />
      <List.Item title={t('Forget this TV')} titleStyle={{ color: palette.danger }} description={t('Remove its saved pairing')} left={(props) => <List.Icon {...props} color={palette.danger} icon="link-off" />} onPress={() => setConfirmForget(true)} style={styles.action} />
    </View>}
  </Sheet>;
}
const styles = StyleSheet.create({
  device: { flexDirection: 'row', gap: 16, padding: 20, marginHorizontal: 24, borderRadius: radius.md, backgroundColor: palette.raised },
  deviceInfo: { flex: 1, gap: 4 }, secondary: { color: palette.muted }, sectionTitle: { marginTop: 28, marginBottom: 8, marginHorizontal: 24, color: palette.accentFg },
  explanation: { marginHorizontal: 24, color: palette.muted, marginBottom: 8 }, scrollSetting: { marginHorizontal: 24, marginTop: 12, gap: 8 },
  divider: { marginHorizontal: 24, marginVertical: 20 }, action: { paddingHorizontal: 12, minHeight: 80 },
  confirm: { paddingHorizontal: 24, gap: 24 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }, choice: { paddingHorizontal: 0 },
});

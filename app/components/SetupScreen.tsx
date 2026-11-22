import { useTranslate } from '../i18n/context';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, HelperText, Icon, IconButton, List, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { native, type FoundTv, type RemoteState } from '../../modules/wave-remote';
import { diagnostic, errorMessage, normalizeHost } from '../lib/remote';
import { palette, radius } from '../theme';
import { ScrollFrame } from './ScrollFrame';

/** `onBack` is set while adding another TV; the current TV's connection state is not shown then. */
export function SetupScreen({ state, run, onConnect, onBack }: {
  state: RemoteState; run: (action: () => Promise<unknown>) => Promise<boolean>;
  onConnect?: () => void; onBack?: () => void;
}) {
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const { fonts } = useTheme();
  const { height } = useWindowDimensions();
  const compact = height - insets.top - insets.bottom < 700;
  const [host, setHost] = useState(onBack ? '' : state.host || '');
  const [invalid, setInvalid] = useState(false);
  const [searching, setSearching] = useState(!!native);
  const [searched, setSearched] = useState(false);
  const [devices, setDevices] = useState<FoundTv[]>([]);
  const [searchError, setSearchError] = useState('');
  const mounted = useRef(true);
  const searchingRef = useRef(false);
  const busy = !onBack && (state.state === 'connecting' || state.state === 'pairing');
  const saved = state.tvs.filter((tv) => tv.paired);
  const savedHosts = new Set(saved.map((tv) => tv.host));
  const discover = async () => {
    if (!native) return;
    try { const found = await native.discover(); if (mounted.current) setDevices(found); }
    catch (error) { if (mounted.current) setSearchError(errorMessage(error)); }
    finally { searchingRef.current = false; if (mounted.current) { setSearching(false); setSearched(true); } }
  };
  const search = () => {
    if (!native || searchingRef.current) return;
    searchingRef.current = true; setSearching(true); setSearchError('');
    void discover();
  };
  useEffect(() => {
    mounted.current = true; searchingRef.current = true;
    if (native) {
      void native.discover().then((found) => { if (mounted.current) setDevices(found); })
        .catch((error: unknown) => { if (mounted.current) setSearchError(errorMessage(error)); })
        .finally(() => { searchingRef.current = false; if (mounted.current) { setSearching(false); setSearched(true); } });
    }
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!onBack) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => subscription.remove();
  }, [onBack]);
  const connect = (device?: Pick<FoundTv, 'host' | 'name'> & { btMac?: string | null }) => {
    const address = normalizeHost(device?.host || host, state.host || saved[0]?.host || devices[0]?.host);
    if (!address) { setInvalid(true); return; }
    setInvalid(false);
    onConnect?.();
    void run(() => native!.connect(address, device?.name || 'LG TV', device?.btMac || null));
  };
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
    <ScrollFrame style={styles.screen} contentContainerStyle={[styles.content, compact && styles.compactContent]}>
    {onBack ? <IconButton icon="arrow-left" accessibilityLabel={t('Back to the remote')} onPress={onBack} style={styles.back} /> : null}
    <View style={[styles.logo, compact && styles.compactLogo]}><Icon source="television" size={36} color={palette.accentFg} /></View>
    <Text variant={compact ? 'headlineMedium' : 'headlineLarge'} accessibilityRole="header">{onBack ? t('Add a TV') : t('Pick your TV')}</Text>
    <Text variant="bodyLarge" style={[styles.intro, compact && { marginTop: 8, marginBottom: 12 }]}>{t('Your phone and TV need to be on the same Wi-Fi network.')}</Text>
    {!native ? <Surface elevation={1} style={styles.notice}>
      <Text variant="titleMedium">{t('Android development build required')}</Text>
      <Text variant="bodyMedium" style={styles.secondary}>{t('TV control uses a custom native module. Open the installed Wave Remote app; Expo Go cannot connect to your TV.')}</Text>
    </Surface> : null}
    {busy ? <Surface elevation={1} style={styles.notice}>
      <View style={styles.busyHeading}><ActivityIndicator size={22} /><Text variant="titleMedium">{state.state === 'pairing' ? t('Approve on your TV') : t('Connecting to your TV')}</Text></View>
      <Text variant="bodyMedium" style={styles.secondary}>{state.state === 'pairing' ? t('Accept the connection request on the TV using its own remote. Keep this screen open.') : t('Connecting to {host}…', { host: state.host || '' })}</Text>
      <Button onPress={() => { void run(() => native!.disconnect()); }}>{t('Cancel')}</Button>
    </Surface> : state.detail && !onBack ? <Surface elevation={1} style={styles.notice}>
      <Text variant="titleMedium">{t('Couldn’t connect')}</Text><Text style={styles.secondary}>{diagnostic(state.detail, t)}</Text>
      <Button icon="refresh" onPress={() => { void run(() => native!.reconnect()); }}>{t('Try again')}</Button>
    </Surface> : null}
    {saved.length && !onBack ? <>
      <Text variant="titleMedium" style={styles.savedHeading} accessibilityRole="header">{t('Your TVs')}</Text>
      <View style={styles.devices}>
        {saved.map((tv) => <List.Item key={tv.host} title={tv.name || 'LG TV'} description={tv.host} accessibilityLabel={`${tv.name || 'LG TV'}, ${tv.host}`} titleNumberOfLines={2} titleStyle={[fonts.titleMedium, styles.deviceTitle]} descriptionStyle={[fonts.bodyMedium, styles.secondary]} left={(props) => <List.Icon {...props} icon="television" />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => connect({ host: tv.host, name: tv.name || 'LG TV' })} disabled={busy} style={styles.device} />)}
      </View>
    </> : null}
    <View style={styles.sectionHeading}><Text variant="titleMedium" accessibilityRole="header">{t('Nearby TVs')}</Text>
      {searching ? <ActivityIndicator size={20} /> : <Button icon="refresh" textColor={palette.accentFg} contentStyle={styles.searchAction} onPress={() => void search()} disabled={!native || busy}>{t('Search again')}</Button>}
    </View>
    <View style={styles.devices}>
      {devices.map((device) => <List.Item key={device.host} title={device.name} description={savedHosts.has(device.host) ? `${device.host} · ${t('Paired')}` : device.host} accessibilityLabel={`${device.name}, ${device.host}${savedHosts.has(device.host) ? t(', paired') : ''}`} titleNumberOfLines={2} titleStyle={[fonts.titleMedium, styles.deviceTitle]} descriptionStyle={[fonts.bodyMedium, styles.secondary]} left={(props) => <List.Icon {...props} icon="television" />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => connect(device)} disabled={busy} style={styles.device} />)}
      {searching ? <Text variant="bodyMedium" style={[styles.empty, compact && { paddingVertical: 12 }]}>{t('Looking for LG webOS TVs…')}</Text> : null}
      {!searching && !devices.length && searched ? <Text variant="bodyMedium" style={[styles.empty, compact && { paddingVertical: 12 }]}>{diagnostic(searchError, t) || t('No TVs found. Turn your TV on, check Wi-Fi, or enter its IP address below.')}</Text> : null}
    </View>
    <View style={[styles.manual, compact && styles.compactManual]}>
      <Text variant="titleMedium" accessibilityRole="header">{t('Connect by IP address')}</Text>
      <Text variant="bodyMedium" style={styles.secondary}>{t('Find it in your TV’s Settings → Network.')}</Text>
      <TextInput label={t('TV IP address')} placeholder="192.168.0.1" mode="outlined" value={host} onChangeText={(value) => { setHost(value); setInvalid(false); }} keyboardType="decimal-pad" autoCorrect={false} autoCapitalize="none" returnKeyType="go" onSubmitEditing={() => connect()} error={invalid} disabled={!native || busy} style={styles.address} />
      {invalid ? <HelperText type="error" padding="none">{t('Enter a valid IP address, such as 192.168.0.1.')}</HelperText> : null}
      <Button mode="contained" icon="lan-connect" onPress={() => connect()} disabled={!native || busy || !host.trim()} contentStyle={styles.connect}>{t('Connect')}</Button>
    </View>
  </ScrollFrame></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, paddingTop: 32, flexGrow: 1, maxWidth: 600, width: '100%', alignSelf: 'center' },
  compactContent: { padding: 16, paddingTop: 16 }, compactLogo: { width: 48, height: 48, borderRadius: radius.md, marginBottom: 12 },
  back: { marginLeft: -12, marginTop: -16, marginBottom: 8 },
  logo: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  intro: { color: palette.muted, marginTop: 12, marginBottom: 24 }, notice: { borderRadius: radius.md, padding: 20, marginBottom: 20, gap: 12 },
  secondary: { color: palette.muted }, busyHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, columnGap: 12 },
  devices: { gap: 8 }, device: { backgroundColor: palette.surface, borderRadius: radius.md, minHeight: 72, paddingVertical: 8, justifyContent: 'center' }, deviceTitle: { color: palette.text }, empty: { color: palette.muted, paddingVertical: 20, lineHeight: 22 },
  savedHeading: { minHeight: 48, textAlignVertical: 'center', marginBottom: 8 },
  searchAction: { minHeight: 48 },
  manual: { marginTop: 32, paddingTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.raised, gap: 12 },
  compactManual: { marginTop: 24, paddingTop: 20 }, address: { backgroundColor: palette.surface }, connect: { minHeight: 52 },
});

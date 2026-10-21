import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Text, TouchableRipple } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { native, NativeTouchpad, type RemoteState } from '../../modules/wave-remote';
import { commands, connectionLabel } from '../lib/remote';
import { palette } from '../theme';
import { Dpad, RemoteButton, Rocker } from './RemoteButton';
import { ScrollFrame } from './ScrollFrame';

export type Panel = 'settings' | 'tvs' | 'inputs' | 'apps' | 'keyboard' | null;
export function RemoteScreen({ state, setPanel, power, run }: {
  state: RemoteState; setPanel: (panel: Panel) => void; power: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const ready = state.state === 'ready';
  const busy = state.waking || state.state === 'connecting' || state.state === 'pairing';
  const { width, height, fontScale } = useWindowDimensions();
  const [availableHeight, setAvailableHeight] = useState(height);
  const compact = availableHeight < 760;
  const sideRockers = compact && fontScale <= 1.3 && width >= 300;
  // Reserve the other controls and footer first; every D-pad target stays at least 48 dp.
  const padSize = sideRockers ? Math.max(48, Math.min(84, Math.floor((Math.min(width, 600) - 156) / 3), Math.floor((availableHeight - 352) / 3)))
    : compact ? Math.max(fontScale > 1.3 ? 64 : 48, Math.min(84, Math.floor((availableHeight - 417) / 3))) : 84;
  const padGap = compact ? 6 : 8;
  const touchpadHeight = compact ? Math.max(160, padSize * 3 + padGap * 2) : 200;
  const row = [styles.row, compact && styles.compactRow];
  const stackedShortcuts = (Math.min(width, 600) - 224) / fontScale < 72;
  const key = (name: string) => () => { void run(() => native!.button(name)); };
  const shortcuts = <View style={[styles.shortcuts, compact && { gap: 8 }, stackedShortcuts && styles.wideShortcuts, sideRockers && styles.horizontalShortcuts]}>
    <RemoteButton label="Apps" icon="view-grid-outline" caption="Apps" disabled={!ready} onPress={() => setPanel('apps')} style={[styles.shortcut, compact && { minHeight: 48 }]} />
    <RemoteButton label="Keyboard" icon="keyboard-outline" caption="Keyboard" disabled={!ready} onPress={() => setPanel('keyboard')} style={[styles.shortcut, compact && { minHeight: 48 }]} />
  </View>;
  const pad = state.touchpad && NativeTouchpad ? <View style={[styles.touchpad, { minHeight: touchpadHeight }, !ready && styles.offlinePad]}>
    {ready ? <NativeTouchpad style={[styles.nativePad, { minHeight: touchpadHeight }]} naturalEdge={state.naturalEdge} naturalTwoFinger={state.naturalTwoFinger} />
      : <><MaterialCommunityIcons name="television-off" size={28} color={palette.onDisabled} /><Text variant="bodyMedium" style={styles.offlineText}>Connect to use the touchpad</Text></>}
  </View> : <Dpad disabled={!ready} size={padSize} gap={padGap} />;
  return <View style={styles.screen} onLayout={(event) => setAvailableHeight(event.nativeEvent.layout.height)}>
    <ScrollFrame style={styles.scroll} contentContainerStyle={[styles.content, compact && { paddingTop: 4 }]}>
    <View style={[styles.header, compact && styles.compactRow]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${state.name || 'LG TV'}. ${connectionLabel(state)}`} accessibilityHint="Reconnect to your TV" style={styles.titles} onPress={() => { if (!ready && !busy) void run(() => native!.reconnect()); }}>
        <Text style={styles.name} numberOfLines={1}>{state.name || 'LG TV'}</Text>
        <Text style={[styles.status, !ready && !busy && { color: palette.power }]} numberOfLines={2} accessibilityLiveRegion="polite">{connectionLabel(state)}</Text>
      </Pressable>
      {busy ? <ActivityIndicator size={18} style={styles.activity} /> : null}
      <RemoteButton label={state.tvs.length > 1 ? 'Switch TV' : 'Add or switch TV'} icon="swap-horizontal" onPress={() => setPanel('tvs')} style={styles.more} />
      <RemoteButton label="Remote settings" icon="dots-horizontal" onPress={() => setPanel('settings')} style={styles.more} />
    </View>
    <View style={row}>
      <RemoteButton label={ready ? 'Power off' : 'Wake TV'} icon="power" color={palette.power} disabled={busy} onPress={power} style={styles.weight} />
      <RemoteButton label="Inputs" icon="application-import" caption="Inputs" disabled={!ready} onPress={() => setPanel('inputs')} style={styles.weight} />
      <RemoteButton label={state.muted ? 'Unmute' : 'Mute'} icon={state.muted ? 'volume-off' : 'volume-high'} color={state.muted ? palette.power : palette.text} disabled={!ready} onPress={() => { void run(() => native!.request('ssap://audio/setMute', { mute: !state.muted })); }} style={styles.weight} />
    </View>
    {sideRockers ? <View style={styles.compactRow}>{shortcuts}</View> : <View style={[styles.controls, compact && styles.compactRow]}>
      <Rocker label="Volume" up={commands.volumeUp} down={commands.volumeDown} disabled={!ready} compact={compact} />
      {!stackedShortcuts ? shortcuts : null}
      <Rocker label="Channel" up={commands.channelUp} down={commands.channelDown} disabled={!ready} compact={compact} />
      {stackedShortcuts ? shortcuts : null}
    </View>}
    <View style={row}>
      {([['rewind', 'rewind', 'Rewind'], ['play', 'play', 'Play'], ['pause', 'pause', 'Pause'], ['fastForward', 'fast-forward', 'Fast forward']] as const).map(([command, icon, label]) =>
        <RemoteButton key={command} label={label} icon={icon} disabled={!ready} onPress={() => { void run(() => native!.request(`ssap://media.controls/${command}`, null)); }} style={styles.weight} />)}
    </View>
    <View style={[styles.modes, compact && styles.compactRow]} accessibilityRole="tablist">
      {([['Buttons', 'gamepad-round-outline'], ['Touchpad', 'gesture-tap']] as const).map(([label, icon], index) => {
        const selected = state.touchpad === (index === 1);
        return <TouchableRipple key={label} onPress={() => { void run(() => native!.preferences(index === 1, state.naturalEdge, state.naturalTwoFinger)); }} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.mode, selected && styles.selectedMode]}>
          <View style={[styles.modeContent, fontScale > 1.3 && styles.largeTextMode]}>
            <MaterialCommunityIcons name={icon} size={18} color={selected ? palette.text : palette.muted} />
            <Text style={{ color: selected ? palette.text : palette.muted, fontSize: 14 }}>{label}</Text>
          </View>
        </TouchableRipple>;
      })}
    </View>
    <View style={[styles.pad, { minHeight: state.touchpad && NativeTouchpad ? touchpadHeight : padSize * 3 + padGap * 2 }]}>
      {sideRockers ? <View style={styles.padWithRockers}>
        <Rocker label="Volume" up={commands.volumeUp} down={commands.volumeDown} disabled={!ready} compact narrow />
        <View style={styles.padCenter}>{pad}</View>
        <Rocker label="Channel" up={commands.channelUp} down={commands.channelDown} disabled={!ready} compact narrow />
      </View> : pad}
    </View>
    <View style={[styles.landingZone, compact && { height: 4 }]} />
    </ScrollFrame>
    <View style={[styles.footer, compact && { paddingTop: 8, paddingBottom: 8 }]}><View style={[styles.row, styles.navigation]}>
      <RemoteButton label="Back" icon="arrow-u-left-top" disabled={!ready} onPress={key('BACK')} style={[styles.weight, styles.navButton, compact && { minHeight: 48 }]} />
      <RemoteButton label="Home" icon="home-outline" disabled={!ready} onPress={key('HOME')} style={[styles.weight, styles.navButton, compact && { minHeight: 48 }]} />
      <RemoteButton label="TV settings" icon="cog-outline" disabled={!ready} onPress={key('MENU')} style={[styles.weight, styles.navButton, compact && { minHeight: 48 }]} />
    </View></View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, maxWidth: 600, width: '100%', alignSelf: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxWidth: 600, width: '100%', alignSelf: 'center' },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  titles: { flex: 1, minHeight: 48, justifyContent: 'center' }, name: { fontSize: 19, fontWeight: '500', color: palette.text },
  status: { fontSize: 12, color: palette.muted, marginTop: 2 }, activity: { marginHorizontal: 4 }, more: { width: 48 },
  row: { flexDirection: 'row', gap: 10, marginHorizontal: 5, marginBottom: 12 }, weight: { flex: 1 },
  compactRow: { marginBottom: 4 },
  horizontalShortcuts: { flexDirection: 'row', flex: 0, flexBasis: 'auto', marginHorizontal: 5, marginTop: 0 },
  padWithRockers: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, padCenter: { flex: 1, alignItems: 'stretch', justifyContent: 'center', alignSelf: 'stretch' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 }, shortcuts: { flex: 1, marginHorizontal: 12, gap: 12 }, wideShortcuts: { flexBasis: '100%', flexGrow: 0, flexShrink: 0, marginHorizontal: 0, marginTop: 12 }, shortcut: { minHeight: 66, flex: 1 },
  modes: { flexDirection: 'row', alignSelf: 'center', width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: palette.surface, padding: 4, marginBottom: 12 },
  mode: { minHeight: 48, paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 24, flex: 1 }, selectedMode: { backgroundColor: palette.raised },
  modeContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  largeTextMode: { flexDirection: 'column' },
  pad: { flex: 1, minHeight: 200, justifyContent: 'center' },
  touchpad: { flex: 1, minHeight: 200, borderRadius: 28, overflow: 'hidden' }, nativePad: { flex: 1, minHeight: 200 },
  offlinePad: { backgroundColor: palette.disabled, alignItems: 'center', justifyContent: 'center', gap: 12 },
  offlineText: { color: palette.muted }, landingZone: { height: 12 }, navigation: { marginBottom: 0 }, navButton: { minHeight: 52, backgroundColor: palette.raised },
});

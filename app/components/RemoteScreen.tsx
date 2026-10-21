import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, TouchableRipple } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { native, NativeTouchpad, type RemoteState } from '../../modules/wave-remote';
import { commands, connectionLabel } from '../lib/remote';
import { palette } from '../theme';
import { ScrollFrame } from './ScrollFrame';
import { Dpad, RemoteButton, RemoteScaleContext, Rocker } from './RemoteButton';

export type Panel = 'settings' | 'tvs' | 'inputs' | 'apps' | 'keyboard' | null;
export function RemoteScreen({ state, setPanel, power, run }: {
  state: RemoteState; setPanel: (panel: Panel) => void; power: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [viewport, setViewport] = useState({ width: 412, height: 850 });
  // React Native reports logical pixels after system bars and display scaling.
  // Keep the reference proportions while leaving scrolling for large accessibility text.
  const scale = Math.max(0.8, Math.min(1, viewport.width / 412, viewport.height / 850));
  const styles = makeStyles(scale);
  const ready = state.state === 'ready';
  const busy = state.waking || state.state === 'connecting' || state.state === 'pairing';
  const key = (name: string) => () => { void run(() => native!.button(name)); };
  return <RemoteScaleContext.Provider value={scale}><View style={styles.screen} onLayout={({ nativeEvent: { layout } }) => setViewport({ width: layout.width, height: layout.height })}>
    <ScrollFrame style={styles.scroll} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${state.name || 'LG TV'}. ${connectionLabel(state)}`} accessibilityHint="Reconnect to your TV" style={styles.titles} onPress={() => { if (!ready && !busy) void run(() => native!.reconnect()); }}>
        <Text style={styles.name} numberOfLines={1}>{state.name || 'LG TV'}</Text>
        <Text style={[styles.status, !ready && !busy && { color: palette.power }]} numberOfLines={2} accessibilityLiveRegion="polite">{connectionLabel(state)}</Text>
      </Pressable>
      {busy ? <ActivityIndicator size={18} style={styles.activity} /> : null}
      <RemoteButton label={state.tvs.length > 1 ? 'Switch TV' : 'Add or switch TV'} icon="swap-horizontal" onPress={() => setPanel('tvs')} style={styles.more} />
      <RemoteButton label="Remote settings" icon="dots-horizontal" onPress={() => setPanel('settings')} style={styles.more} />
    </View>
    <View style={styles.row}>
      <RemoteButton label={ready ? 'Power off' : 'Wake TV'} icon="power" color={palette.power} disabled={busy} onPress={power} style={styles.weight} />
      <RemoteButton label="Inputs" icon="application-import" caption="Inputs" disabled={!ready} onPress={() => setPanel('inputs')} style={styles.weight} />
      <RemoteButton label={state.muted ? 'Unmute' : 'Mute'} icon={state.muted ? 'volume-off' : 'volume-high'} color={state.muted ? palette.power : palette.text} disabled={!ready} onPress={() => { void run(() => native!.request('ssap://audio/setMute', { mute: !state.muted })); }} style={styles.weight} />
    </View>
    <View style={styles.controls}>
      <Rocker label="Volume" up={commands.volumeUp} down={commands.volumeDown} disabled={!ready} />
      <View style={styles.shortcuts}>
        <RemoteButton label="Apps" icon="view-grid-outline" caption="Apps" disabled={!ready} onPress={() => setPanel('apps')} style={styles.shortcut} />
        <RemoteButton label="Keyboard" icon="keyboard-outline" caption="Keyboard" disabled={!ready} onPress={() => setPanel('keyboard')} style={styles.shortcut} />
      </View>
      <Rocker label="Channel" up={commands.channelUp} down={commands.channelDown} disabled={!ready} />
    </View>
    <View style={styles.row}>
      {([['rewind', 'rewind', 'Rewind'], ['play', 'play', 'Play'], ['pause', 'pause', 'Pause'], ['fastForward', 'fast-forward', 'Fast forward']] as const).map(([command, icon, label]) =>
        <RemoteButton key={command} label={label} icon={icon} disabled={!ready} onPress={() => { void run(() => native!.request(`ssap://media.controls/${command}`, null)); }} style={styles.weight} />)}
    </View>
    <View style={styles.modes} accessibilityRole="tablist">
      {([['Buttons', 'gamepad-round-outline'], ['Touchpad', 'gesture-tap']] as const).map(([label, icon], index) => {
        const selected = state.touchpad === (index === 1);
        return <TouchableRipple key={label} onPress={() => { void run(() => native!.preferences(index === 1, state.naturalEdge, state.naturalTwoFinger)); }} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.mode, selected && styles.selectedMode]}>
          <View style={styles.modeContent}>
            <MaterialCommunityIcons name={icon} size={18 * scale} color={selected ? palette.text : palette.muted} />
            <Text style={{ color: selected ? palette.text : palette.muted, fontSize: 14 * scale }}>{label}</Text>
          </View>
        </TouchableRipple>;
      })}
    </View>
    <View style={[styles.pad, !(state.touchpad && NativeTouchpad) && styles.buttonPad]}>
      {state.touchpad && NativeTouchpad ? <View style={[styles.touchpad, !ready && styles.offlinePad]}>
        {/* The native pad draws its own hints, so leave it out entirely while it can't be used. */}
        {ready ? <NativeTouchpad style={styles.nativePad} naturalEdge={state.naturalEdge} naturalTwoFinger={state.naturalTwoFinger} />
          : <><MaterialCommunityIcons name="television-off" size={28} color={palette.onDisabled} /><Text variant="bodyMedium" style={styles.offlineText}>Connect to use the touchpad</Text></>}
      </View> : <Dpad disabled={!ready} />}
    </View>
    <View style={styles.landingZone} />
    </ScrollFrame>
    <View style={styles.footer}><View style={[styles.row, styles.navigation]}>
      <RemoteButton label="Back" icon="arrow-u-left-top" disabled={!ready} onPress={key('BACK')} style={[styles.weight, styles.navButton]} />
      <RemoteButton label="Home" icon="home-outline" disabled={!ready} onPress={key('HOME')} style={[styles.weight, styles.navButton]} />
      <RemoteButton label="TV settings" icon="cog-outline" disabled={!ready} onPress={key('MENU')} style={[styles.weight, styles.navButton]} />
    </View></View>
  </View></RemoteScaleContext.Provider>;
}
const makeStyles = (scale: number) => StyleSheet.create({
  screen: { flex: 1 }, scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16 * scale, paddingTop: 8 * scale, maxWidth: 600, width: '100%', alignSelf: 'center' },
  footer: { paddingHorizontal: 16 * scale, paddingTop: 12 * scale, paddingBottom: 12 * scale, maxWidth: 600, width: '100%', alignSelf: 'center' },
  header: { minHeight: 48 * scale, flexDirection: 'row', alignItems: 'center', marginBottom: 12 * scale, gap: 8 * scale },
  titles: { flex: 1, minHeight: 48 * scale, justifyContent: 'center' }, name: { fontSize: 19 * scale, fontWeight: '500', color: palette.text },
  status: { fontSize: 12 * scale, color: palette.muted, marginTop: 2 * scale }, activity: { marginHorizontal: 4 * scale }, more: { width: 48 * scale },
  row: { flexDirection: 'row', gap: 10 * scale, marginHorizontal: 5 * scale, marginBottom: 12 * scale }, weight: { flex: 1 },
  controls: { flexDirection: 'row', marginBottom: 12 * scale }, shortcuts: { flex: 1, marginHorizontal: 12 * scale, gap: 12 * scale }, shortcut: { minHeight: 66 * scale, flex: 1 },
  modes: { flexDirection: 'row', alignSelf: 'stretch', marginHorizontal: 10 * scale, borderRadius: 28 * scale, backgroundColor: palette.surface, padding: 4 * scale, marginBottom: 12 * scale },
  mode: { minHeight: 48 * scale, paddingHorizontal: 16 * scale, alignItems: 'center', justifyContent: 'center', borderRadius: 24 * scale, flex: 1 }, selectedMode: { backgroundColor: palette.raised },
  modeContent: { flexDirection: 'row', alignItems: 'center', gap: 8 * scale },
  pad: { flex: 1, minHeight: 200 * scale, justifyContent: 'center' },
  buttonPad: { minHeight: 268 * scale },
  touchpad: { flex: 1, minHeight: 200 * scale, borderRadius: 28 * scale, overflow: 'hidden' }, nativePad: { flex: 1, minHeight: 200 * scale },
  offlinePad: { backgroundColor: palette.disabled, alignItems: 'center', justifyContent: 'center', gap: 12 * scale },
  offlineText: { color: palette.muted }, landingZone: { height: 12 * scale }, navigation: { marginBottom: 0 }, navButton: { minHeight: 52 * scale, backgroundColor: palette.raised },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { initialState, native } from '../../modules/wave-remote';
import { errorMessage } from '../lib/remote';

export function useRemote() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(!!native);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const run = useCallback(async (action: () => Promise<unknown>) => {
    try { await action(); return true; }
    catch (error) { if (mounted.current) setMessage(errorMessage(error)); return false; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const module = native;
    if (!module) return;
    let changed = false;
    const subscription = module.addListener('onChange', (next) => { changed = true; setState(next); });
    void module.snapshot().then(async (next) => {
      if (!mounted.current) return;
      if (!changed) setState(next);
      // Hold the loading screen until the reconnect reports itself, so a saved TV never flashes as disconnected.
      if (next.host) await run(() => module.reconnect());
    }).catch((error: unknown) => setMessage(errorMessage(error))).finally(() => setLoading(false));
    const lifecycle = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void module.stopHeld();
    });
    return () => {
      mounted.current = false;
      subscription.remove(); lifecycle.remove();
      void module.stopHeld();
    };
  }, [run]);

  // The first connection of each launch sets up the background connection: notification controls,
  // then (once ever) Android's battery optimization exemption, which keeps the screen-off socket alive.
  const backgroundAsked = useRef(false);
  useEffect(() => {
    if (!native || state.state !== 'ready' || !state.background || backgroundAsked.current) return;
    backgroundAsked.current = true;
    const module = native;
    void run(async () => {
      if (state.controls && !state.notifications) await askForNotifications();
      await module.allowBackground(false);
    });
  }, [run, state.state, state.background, state.controls, state.notifications]);

  const power = () => run(async () => {
    if (!native) return;
    const current = await native.snapshot();
    let bluetooth = false;
    if (current.state !== 'ready' && current.canWakeBluetooth) {
      bluetooth = true;
      if (Platform.OS === 'android' && Number(Platform.Version) >= 31) {
        bluetooth = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE)
          === PermissionsAndroid.RESULTS.GRANTED;
        if (!bluetooth) setMessage('Bluetooth wake-up is unavailable. Trying Wake-on-LAN.');
      }
    }
    await native.power(bluetooth);
  });
  return { state, loading, message, setMessage, run, power };
}

/**
 * Asks for the notification permission, which Android 13 added. Resolves false when only Settings can
 * turn notifications on: on older Android, or once the user has declined the prompt for good.
 */
export async function askForNotifications(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return false;
  return await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
}

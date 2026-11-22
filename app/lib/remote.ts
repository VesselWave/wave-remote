import { english, isMessage, type Translate } from '../i18n/messages';
import type { RemoteState } from '../../modules/wave-remote';

/** `.N` is shorthand for host N on the same /24 as `near`, a TV address the app already knows. */
export function normalizeHost(raw: string, near?: string | null): string | null {
  const subnet = near?.match(/^(\d{1,3}\.){3}/)?.[0];
  const host = raw.trim().replace(/^\.(\d{1,3})$/, subnet ? `${subnet}$1` : '$&');
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) && host.split('.').every((part) => Number(part) <= 255)
    ? host.split('.').map((part) => String(Number(part))).join('.') : null;
}
export function connectionLabel(state: RemoteState, t: Translate = english): string {
  if (state.waking) return state.detail ? t('Waking TV · {detail}', { detail: diagnostic(state.detail, t) }) : t('Waking TV…');
  if (state.state === 'pairing') return t('Accept the connection request on your TV');
  if (state.state === 'connecting') return t('Connecting…');
  if (state.state === 'ready') return state.muted ? t('Connected · Muted')
    : state.volume >= 0 ? t('Connected · Volume {volume}', { volume: state.volume }) : t('Connected');
  return state.detail ? t('{detail} · Tap to retry', { detail: diagnostic(state.detail, t) }) : t('Disconnected · Tap to retry');
}
/** Keep unrecognised TV and operating-system diagnostics verbatim. */
export function diagnostic(message: string, t: Translate): string {
  if (isMessage(message)) return t(message);
  for (const key of ['Wake-on-LAN failed: {detail}', 'Handshake refused: {detail}'] as const) {
    const prefix = key.slice(0, -'{detail}'.length);
    if (message.startsWith(prefix)) return t(key, { detail: message.slice(prefix.length) });
  }
  return message;
}
export function errorMessage(error: unknown, t: Translate = english): string {
  return error instanceof Error ? diagnostic(error.message, t) : t('Something went wrong. Please try again.');
}
export const commands = {
  volumeUp: 'ssap://audio/volumeUp', volumeDown: 'ssap://audio/volumeDown',
  channelUp: 'ssap://tv/channelUp', channelDown: 'ssap://tv/channelDown',
  inputs: 'ssap://tv/getExternalInputList', apps: 'ssap://com.webos.applicationManager/listLaunchPoints',
  foregroundApp: 'ssap://com.webos.applicationManager/getForegroundAppInfo',
};

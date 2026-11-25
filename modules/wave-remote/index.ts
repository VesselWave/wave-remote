import { requireOptionalNativeModule, requireNativeView, NativeModule } from 'expo';
import type { ViewProps } from 'react-native';

export interface RemoteState {
  host: string | null;
  name: string | null;
  paired: boolean;
  state: 'disconnected' | 'connecting' | 'pairing' | 'ready';
  detail: string | null;
  volume: number;
  muted: boolean;
  touchpad: boolean;
  /** Scroll direction for the right-edge strip and for two-finger gestures. */
  naturalEdge: boolean;
  naturalTwoFinger: boolean;
  waking: boolean;
  canWakeBluetooth: boolean;
  /** Stay connected in the background, with volume and playback controls in a notification. */
  background: boolean;
  /** Volume, play and pause buttons in the background notification, which Android shows regardless. */
  controls: boolean;
  /** Android's battery optimization applies, so it may still cut the background connection. */
  batteryRestricted: boolean;
  /** Wave Remote may post notifications; without it the background connection runs unseen. */
  notifications: boolean;
  /** The selected TV's favourite app ids, in the user's order. */
  favorites: string[];
  /** App ids hidden from the selected TV's launcher; never also favourites. */
  hidden: string[];
  /** Saved TVs, including the selected one while it pairs. */
  tvs: SavedTv[];
}
/** `name` is the custom `label` if set, else the name the TV reports (`tvName`). */
export interface SavedTv { host: string; name: string | null; tvName: string | null; label: string | null; paired: boolean }
export interface FoundTv { host: string; name: string; btMac: string | null }
export interface TvInput { id: string; label?: string; connected?: boolean; hdmiSignalExist?: boolean }
/** A webOS launch point. `icon` and `largeIcon` are served by the TV itself, usually from its self-signed https://TV:3001/resources/. */
export interface TvApp { id: string; title?: string; params?: Record<string, unknown>; icon?: string; largeIcon?: string; iconColor?: string }
export interface TvResponse {
  devices?: TvInput[];
  launchPoints?: TvApp[];
  [key: string]: unknown;
}
type Events = { onChange: (state: RemoteState) => void };
declare class WaveRemoteNative extends NativeModule<Events> {
  snapshot(): Promise<RemoteState>;
  connect(host: string, name: string, btMac: string | null): Promise<void>;
  reconnect(): Promise<void>;
  disconnect(): Promise<void>;
  discover(): Promise<FoundTv[]>;
  forget(): Promise<void>;
  rename(host: string, label: string): Promise<void>;
  request(uri: string, payload: Record<string, unknown> | null): Promise<TvResponse>;
  button(key: string): Promise<void>;
  startHeld(key: string, pointer: boolean): Promise<void>;
  stopHeld(): Promise<void>;
  power(bluetooth: boolean): Promise<void>;
  setFavorites(ids: string[]): Promise<void>;
  /** Saves the hidden apps and removes them from the favourites. */
  setHidden(ids: string[]): Promise<void>;
  /** Downloads a TV icon through the pinned certificate; resolves to a cached file:// URI. */
  icon(url: string): Promise<string>;
  preferences(touchpad: boolean, naturalEdge: boolean, naturalTwoFinger: boolean): Promise<void>;
  setBackground(on: boolean): Promise<void>;
  setControls(on: boolean): Promise<void>;
  /** Asks Android to exempt the app from battery optimization; with `always` false, only the first time. */
  allowBackground(always: boolean): Promise<void>;
  openNotificationSettings(): Promise<void>;
}
export const native = requireOptionalNativeModule<WaveRemoteNative>('WaveRemote');
export const NativeTouchpad = native
  ? requireNativeView<ViewProps & { naturalEdge: boolean; naturalTwoFinger: boolean }>('WaveRemote')
  : null;
export const initialState: RemoteState = {
  host: null, name: null, paired: false, state: 'disconnected', detail: null,
  volume: -1, muted: false, touchpad: false, naturalEdge: false, naturalTwoFinger: false,
  waking: false, canWakeBluetooth: false, background: true, controls: true, batteryRestricted: false, notifications: true, favorites: [], hidden: [], tvs: [],
};

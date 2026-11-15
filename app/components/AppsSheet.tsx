import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, FlatList, Image, LayoutAnimation, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Button, Icon, IconButton, Searchbar, Text, TouchableRipple } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { native, type TvApp } from '../../modules/wave-remote';
import { commands, errorMessage } from '../lib/remote';
import { request } from '../lib/transport';
import { palette, radius } from '../theme';
import { Sheet, SHEET_END_PADDING } from './Sheet';
import { useScrollCues } from './ScrollFrame';

type App = { id: string; title: string; icon?: string; tile?: string; color?: string; params?: Record<string, unknown> };
const hex = /^#[0-9a-f]{6}$/i;
const toApp = (app: TvApp): App => ({
  id: app.id, title: app.title || app.id, params: app.params, icon: app.icon || app.largeIcon,
  tile: app.largeIcon || app.icon, color: app.iconColor && hex.test(app.iconColor) ? app.iconColor : undefined,
});

// The TV serves icons over its self-signed TLS port, which Android's image loader rejects, so the
// native module downloads them through the pinned certificate into a cache. Kept for the session,
// so reopening the sheet (or the same app in Favourites and All apps) shows them at once.
const iconFiles = new Map<string, string>();
const iconLoads = new Map<string, Promise<string>>();
function iconFile(uri: string): Promise<string> {
  if (!/^https:\/\//i.test(uri) || !native) return Promise.resolve(uri);
  let load = iconLoads.get(uri);
  if (!load) {
    load = native.icon(uri).then((file) => { iconFiles.set(uri, file); return file; });
    iconLoads.set(uri, load);
    // A failure isn't remembered: the next time the sheet opens, it tries again.
    load.catch(() => iconLoads.delete(uri));
  }
  return load;
}
const cachedIcon = (uri?: string) => (uri && !/^https:\/\//i.test(uri) ? uri : uri ? iconFiles.get(uri) : undefined);

/** The TV's own icon on its own colour; the app's initial if the TV has none or it can't load. */
const AppIcon = memo(function AppIcon({ app, size, large }: { app: App; size: number; large?: boolean }) {
  const uri = large ? app.tile : app.icon;
  const [file, setFile] = useState(() => cachedIcon(uri));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!uri || cachedIcon(uri)) return;
    let live = true;
    // The TV sometimes drops one of several parallel downloads, so a failure gets one retry.
    iconFile(uri).catch(() => new Promise((wait) => setTimeout(wait, 1500)).then(() => (live ? iconFile(uri) : Promise.reject(new Error('gone')))))
      .then((loaded) => { if (live) setFile(loaded); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [uri]);
  const shape = { width: size, height: size, borderRadius: Math.round(size * 0.24) };
  if (!uri || failed) return <View style={[shape, styles.monogram]}>
    <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{app.title.trim().charAt(0).toUpperCase() || '?'}</Text></View>;
  // While downloading, hold the icon's place in its own colour so nothing jumps when it arrives.
  const backing = { backgroundColor: app.color ?? palette.raised };
  if (!file) return <View style={[shape, backing]} />;
  return <Image source={{ uri: file }} onError={() => setFailed(true)} accessibilityIgnoresInvertColors fadeDuration={0} style={[shape, backing]} />;
});

/** Browsing opens apps; the two editing modes take over the list until Done (or Back). */
type Mode = 'browse' | 'arrange' | 'hide';

export function AppsSheet({ onClose, report, ready, favorites: saved, hidden: savedHidden }: {
  onClose: () => void; report: (message: string) => void; ready: boolean; favorites: string[]; hidden: string[];
}) {
  const [apps, setApps] = useState<App[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(ready);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<Mode>('browse');
  /** The app the TV is showing now, marked "On TV"; unknown if the TV doesn't say. */
  const [current, setCurrent] = useState<string | null>(null);
  // Shown at once; the native store echoes the same list back through the remote state.
  const [favorites, setFavorites] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) { setSeen(saved); setFavorites(saved); }
  const [hidden, setHidden] = useState(savedHidden);
  const [seenHidden, setSeenHidden] = useState(savedHidden);
  if (seenHidden !== savedHidden) { setSeenHidden(savedHidden); setHidden(savedHidden); }
  const [reducedMotion, setReducedMotion] = useState(true);
  /** The sheet's height while browsing; the editing modes keep it, so the sheet doesn't jump on Edit or Done. */
  const [browseHeight, setBrowseHeight] = useState(0);
  const generation = useRef(0);
  const listRef = useRef<FlatList<App>>(null);
  const activeAction = useRef(false);
  const scroll = useScrollCues(SHEET_END_PADDING);
  const { width, fontScale } = useWindowDimensions();

  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); }, []);
  useEffect(() => {
    const token = ++generation.current;
    if (!ready) return;
    void request(commands.apps).then((response) => {
      if (generation.current !== token) return;
      const list = (response.launchPoints || []).filter((app) => !!app.id).map(toApp);
      setApps(list.sort((a, b) => a.title.localeCompare(b.title)));
    }).catch((issue: unknown) => { if (generation.current === token) setError(errorMessage(issue)); })
      .finally(() => { if (generation.current === token) setLoading(false); });
    // Only a hint, so a TV that refuses or doesn't know just leaves nothing marked.
    void request(commands.foregroundApp).then((response) => {
      if (generation.current === token && typeof response.appId === 'string') setCurrent(response.appId);
    }).catch(() => undefined);
    return () => { generation.current = token + 1; };
  }, [retry, ready]);

  const loaded = ready && !loading && !error;
  const byId = new Map(apps.map((app) => [app.id, app]));
  // Favourites the TV no longer lists stay saved (an app may come back) but aren't shown.
  const pinned = favorites.map((id) => byId.get(id)).filter((app): app is App => !!app && !hidden.includes(app.id));
  // Removing the last favourite leaves nothing to arrange, so the sheet goes back to browsing.
  if (mode === 'arrange' && (!loaded || pinned.length === 0)) setMode('browse');
  if (mode === 'hide' && !loaded) setMode('browse');

  const animate = () => { if (!reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')); };
  const enter = (next: Mode) => {
    if (next === mode) return;
    void Haptics.selectionAsync();
    animate();
    setQuery('');
    setMode(next);
    // Each mode starts at its top, wherever the list was scrolled (the hidden-apps row is at the end).
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const save = (next: string[]) => {
    animate();
    setFavorites(next);
    void native?.setFavorites(next).catch((issue: unknown) => { report(errorMessage(issue)); setFavorites(saved); });
  };
  // Hiding an app also unpins it (the native store does the same), so it is gone from the whole launcher.
  const toggleHidden = (app: App) => {
    void Haptics.selectionAsync();
    const next = hidden.includes(app.id) ? hidden.filter((id) => id !== app.id) : [...hidden, app.id];
    setHidden(next);
    setFavorites(favorites.filter((id) => !next.includes(id)));
    void native?.setHidden(next).catch((issue: unknown) => { report(errorMessage(issue)); setHidden(savedHidden); setFavorites(saved); });
  };
  const toggle = (app: App) => {
    void Haptics.selectionAsync();
    save(favorites.includes(app.id) ? favorites.filter((id) => id !== app.id) : [...favorites, app.id]);
  };
  const move = (app: App, by: -1 | 1) => {
    const order = pinned.map((item) => item.id);
    const from = order.indexOf(app.id), to = from + by;
    if (from < 0 || to < 0 || to >= order.length) return;
    void Haptics.selectionAsync();
    order.splice(to, 0, ...order.splice(from, 1));
    save([...order, ...favorites.filter((id) => !byId.has(id))]);
  };

  const launch = async (app: App) => {
    if (activeAction.current || !ready || mode !== 'browse') return;
    activeAction.current = true;
    const token = generation.current;
    setActing(app.id);
    try {
      await native!.request('ssap://system.launcher/launch', { id: app.id, ...(app.params ? { params: app.params } : {}) });
      if (token === generation.current) onClose();
    } catch (issue) { if (token === generation.current) report(errorMessage(issue)); }
    finally { if (token === generation.current) { setActing(null); activeAction.current = false; } }
  };

  const searching = mode === 'browse' && query.trim().length > 0;
  const visible = apps.filter((app) => !hidden.includes(app.id));
  const filtered = searching ? visible.filter((app) => app.title.toLowerCase().includes(query.trim().toLowerCase())) : visible;
  const hiddenCount = apps.length - visible.length;
  // Arranging lists only the favourites; hiding lists every app, hidden ones included.
  const data = !loaded ? [] : mode === 'arrange' ? pinned : mode === 'hide' ? apps : filtered;
  // Sheet content spans min(width, 600) with 24 on each side; tiles keep at least 80 (scaled with text).
  const gap = 8;
  const inner = Math.min(width, 600) - 48;
  const columns = Math.max(3, Math.min(5, Math.floor((inner + gap) / (80 * Math.min(fontScale, 1.6) + gap))));
  const tileWidth = Math.floor((inner - gap * (columns - 1)) / columns);

  const tile = (app: App) => {
    const busy = acting === app.id, live = app.id === current;
    return <View key={app.id} style={{ width: tileWidth }}>
      <TouchableRipple borderless onPress={() => void launch(app)} onLongPress={() => enter('arrange')}
        disabled={(!!acting && !busy) || !ready} style={styles.tile} accessibilityRole="button"
        accessibilityLabel={`Open ${app.title}${live ? ', on TV now' : ''}`} accessibilityHint="Long press to edit favourites">
        <View style={styles.tileBody}>
          <View><AppIcon app={app} size={52} large />{busy ? <View style={styles.busy}><ActivityIndicator size={22} color={palette.text} /></View> : null}
            {live && !busy ? <View style={styles.badgeRow} pointerEvents="none"><Text style={styles.badge}>On TV</Text></View> : null}</View>
          <Text variant="bodySmall" numberOfLines={2} style={styles.tileTitle}>{app.title}</Text>
        </View>
      </TouchableRipple>
    </View>;
  };

  const sectionHeader = (title: string, action?: ReactNode) => <View style={styles.sectionHeader}>
    <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">{title}</Text>{action}</View>;

  const favouritesSection = <View style={styles.section}>
    {sectionHeader('Favourites', pinned.length > 0
      ? <Button compact onPress={() => enter('arrange')} accessibilityLabel="Edit favourites">Edit</Button> : null)}
    {pinned.length > 0 ? <View style={[styles.grid, { gap }]}>{pinned.map(tile)}</View>
      : <View style={styles.emptyFavourites}>
        <View style={styles.emptyIcon}><Icon source="star-outline" size={24} color={palette.accentFg} /></View>
        <View style={styles.emptyText}><Text variant="titleMedium">Keep your go-to apps here</Text>
          <Text variant="bodyMedium" style={styles.secondary}>Tap the star next to an app below to pin it.</Text></View>
      </View>}
  </View>;

  // The search field, or while editing a bar that says what the mode does and always offers Done.
  // Both sit above the list, so neither scrolls away.
  const modeBar = (title: string, detail: string) => <View style={styles.modeBar}>
    <View style={styles.modeText}><Text variant="titleMedium" accessibilityRole="header">{title}</Text>
      <Text variant="bodySmall" style={styles.secondary}>{detail}</Text></View>
    <Button mode="contained" onPress={() => enter('browse')} accessibilityLabel={`Done, ${title.toLowerCase()}`} style={styles.done}>Done</Button>
  </View>;
  const toolbar = !loaded || apps.length === 0 ? null
    : mode === 'arrange' ? modeBar('Edit favourites', 'Use the arrows to reorder. Tap a star to remove.')
    : mode === 'hide' ? modeBar('Hide apps', hiddenCount > 0 ? `${hiddenCount} hidden. Tap an eye to show or hide an app.` : 'Tap an eye to show or hide an app.')
    : <Searchbar placeholder="Search apps" accessibilityLabel="Search TV apps" value={query} onChangeText={setQuery} style={styles.search} />;

  const listHeader = !loaded || apps.length === 0 || mode !== 'browse' ? <View style={styles.modeGap} /> : <>
    {searching ? null : favouritesSection}
    <View style={styles.section}>{sectionHeader(searching ? `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}` : 'All apps',
      searching ? null : <Button compact onPress={() => enter('hide')} accessibilityLabel="Hide apps">Hide apps</Button>)}</View>
  </>;
  // Hidden apps stay reachable: the count leads to the hiding mode, where they can be shown again.
  const footer = !loaded ? null
    : mode === 'arrange' ? <Text variant="bodyMedium" style={[styles.secondary, styles.hint]}>To add a favourite, tap Done and star it in All apps.</Text>
    : mode === 'browse' && hiddenCount > 0 && !searching ? <TouchableRipple onPress={() => enter('hide')} style={styles.row} accessibilityRole="button"
      accessibilityLabel={`${hiddenCount} hidden ${hiddenCount === 1 ? 'app' : 'apps'}. Show or hide apps`}>
      <View style={styles.rowBody}>
        <View style={styles.hiddenIcon}><Icon source="eye-off-outline" size={20} color={palette.muted} /></View>
        <Text variant="bodyLarge" style={[styles.rowTitle, styles.secondary]}>{hiddenCount} hidden {hiddenCount === 1 ? 'app' : 'apps'}</Text>
        <View style={styles.trailing}><Icon source="chevron-right" size={24} color={palette.muted} /></View>
      </View>
    </TouchableRipple> : null;

  const renderItem = ({ item: app, index }: { item: App; index: number }) => {
    if (mode === 'arrange') return <View style={styles.row}>
      <View style={styles.rowBody}>
        <AppIcon app={app} size={40} />
        <Text variant="bodyLarge" numberOfLines={2} style={styles.rowTitle}>{app.title}</Text>
        <View style={styles.rowActions}>
          <IconButton icon="arrow-up" disabled={index === 0} onPress={() => move(app, -1)} accessibilityLabel={`Move ${app.title} earlier`} style={styles.action} />
          <IconButton icon="arrow-down" disabled={index === pinned.length - 1} onPress={() => move(app, 1)} accessibilityLabel={`Move ${app.title} later`} style={styles.action} />
          <IconButton icon="star" iconColor={palette.accentFg} onPress={() => toggle(app)} accessibilityLabel={`Remove ${app.title} from favourites`} style={styles.action} />
        </View>
      </View>
    </View>;
    const isHidden = hidden.includes(app.id);
    if (mode === 'hide') return <View style={styles.row}>
      <View style={styles.rowBody}>
        <AppIcon app={app} size={40} />
        <Text variant="bodyLarge" numberOfLines={2} style={[styles.rowTitle, isHidden && styles.hiddenTitle]}>{app.title}</Text>
        <IconButton icon={isHidden ? 'eye-off-outline' : 'eye-outline'} iconColor={isHidden ? palette.muted : palette.accentFg}
          onPress={() => toggleHidden(app)} style={styles.action}
          accessibilityLabel={`${isHidden ? 'Show' : 'Hide'} ${app.title}`} accessibilityValue={{ text: isHidden ? 'Hidden' : 'Visible' }} />
      </View>
    </View>;
    const starred = favorites.includes(app.id);
    return <TouchableRipple onPress={() => void launch(app)} disabled={!!acting || !ready} style={styles.row}
      accessibilityRole="button" accessibilityLabel={`Open ${app.title}${app.id === current ? ', on TV now' : ''}`}
      accessibilityActions={[{ name: 'hide', label: `Hide ${app.title}` }]} onAccessibilityAction={() => toggleHidden(app)}>
      <View style={styles.rowBody}>
        <AppIcon app={app} size={40} />
        <View style={styles.rowTitle}>
          <Text variant="bodyLarge" numberOfLines={2}>{app.title}</Text>
          {app.id === current ? <Text variant="labelMedium" style={styles.live}>On TV now</Text> : null}
        </View>
        {acting === app.id ? <View style={styles.trailing}><ActivityIndicator size={20} /></View>
          : <IconButton icon={starred ? 'star' : 'star-outline'} iconColor={starred ? palette.accentFg : palette.muted} onPress={() => toggle(app)}
            selected={starred} accessibilityLabel={starred ? `Remove ${app.title} from favourites` : `Add ${app.title} to favourites`} style={styles.action} />}
      </View>
    </TouchableRipple>;
  };

  return <Sheet open onClose={onClose} onBack={mode === 'browse' ? onClose : () => enter('browse')} title="Apps" subtitle="Open an app on your TV.">
    {(heading) => <View style={[styles.scroll, mode !== 'browse' && { minHeight: browseHeight }]}
      onLayout={(event) => { if (mode === 'browse') setBrowseHeight(event.nativeEvent.layout.height); }}>{heading}{toolbar}
      <View {...scroll.frameProps} style={styles.scroll}><FlatList contentContainerStyle={scroll.contentStyle} ref={listRef} {...scroll.props} style={styles.scroll} data={data}
        keyExtractor={(app) => app.id} keyboardShouldPersistTaps="handled"
        extraData={[favorites, hidden, mode, acting, current, pinned.length]}
        ListHeaderComponent={listHeader} ListFooterComponent={footer} renderItem={renderItem}
        ListEmptyComponent={!ready ? <View style={styles.empty}><Text>Your TV disconnected. Close this menu and reconnect.</Text></View>
          : loading ? <View style={styles.empty}><ActivityIndicator /><Text style={[styles.secondary, styles.center]}>Loading from your TV…</Text></View>
          : error ? <View style={styles.empty}><Icon source="wifi-alert" size={36} color={palette.muted} /><Text variant="bodyLarge" style={styles.center}>{error}</Text>
            <Button icon="refresh" onPress={() => { setError(''); setLoading(true); setRetry((value) => value + 1); }} disabled={!ready}>Try again</Button></View>
          : <View style={styles.empty}><Icon source="view-grid-outline" size={40} color={palette.muted} />
            <Text variant="titleMedium">{searching ? 'No matching apps' : apps.length > 0 ? 'Every app is hidden' : 'No apps reported'}</Text>
            <Text style={[styles.secondary, styles.center]}>{searching ? 'Try a different app name.' : apps.length > 0 ? 'Show some again from the hidden apps below.' : 'Your TV returned an empty list.'}</Text></View>} />
        {scroll.cues}</View>
    </View>}
  </Sheet>;
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  search: { marginHorizontal: 24, marginBottom: 8, backgroundColor: palette.raised },
  // Same slot and height as the search field, so entering or leaving a mode doesn't shift the list.
  modeBar: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, marginHorizontal: 24, marginBottom: 8, paddingVertical: 8 },
  modeText: { flex: 1, gap: 2 }, done: { minWidth: 88 }, modeGap: { height: 8 },
  section: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48 },
  sectionTitle: { color: palette.accentFg, flexShrink: 1 },
  hiddenTitle: { color: palette.muted, textDecorationLine: 'line-through' },
  hiddenIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  // Every row ends in the same 48-wide slot (star, spinner, eye or chevron), so they line up.
  trailing: { minWidth: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  action: { margin: 0, width: 48, height: 48 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 4 },
  tile: { borderRadius: radius.md, backgroundColor: palette.raised, overflow: 'hidden' },
  tileBody: { alignItems: 'center', gap: 10, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 6, minHeight: 106 },
  tileTitle: { textAlign: 'center', color: palette.text },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#00000080' },
  badgeRow: { position: 'absolute', left: -12, right: -12, bottom: -8, alignItems: 'center' },
  badge: { color: palette.onAccent, backgroundColor: palette.accent, fontSize: 10, lineHeight: 14, fontWeight: '700', paddingHorizontal: 6, borderRadius: radius.pill, borderWidth: 2, borderColor: palette.raised, overflow: 'hidden' },
  emptyFavourites: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: '#383E4B' },
  emptyIcon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accentSoft },
  emptyText: { flex: 1, gap: 2 },
  monogram: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accentSoft },
  initial: { color: palette.accentFg, fontWeight: '700' },
  row: { borderRadius: radius.md, marginHorizontal: 12 },
  rowBody: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, paddingLeft: 12, paddingRight: 4 },
  rowTitle: { flex: 1 },
  live: { color: palette.accentFg },
  hint: { paddingHorizontal: 24, paddingTop: 12, textAlign: 'center' },
  empty: { alignItems: 'center', padding: 32, gap: 16 }, secondary: { color: palette.muted }, center: { textAlign: 'center' },
});

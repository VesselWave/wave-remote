import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, FlatList, Image, LayoutAnimation, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Button, Icon, IconButton, Searchbar, Text, TouchableRipple } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { native, type TvApp } from '../../modules/wave-remote';
import { commands, errorMessage } from '../lib/remote';
import { request } from '../lib/transport';
import { palette, radius } from '../theme';
import { Sheet } from './Sheet';
import { useScrollCues } from './ScrollFrame';

type App = { id: string; title: string; icon?: string; tile?: string; color?: string; params?: Record<string, unknown> };
const hex = /^#[0-9a-f]{6}$/i;
const toApp = (app: TvApp): App => ({
  id: app.id, title: app.title || app.id, params: app.params, icon: app.icon || app.largeIcon,
  tile: app.largeIcon || app.icon, color: app.iconColor && hex.test(app.iconColor) ? app.iconColor : undefined,
});

/** The TV's own icon when it serves one; otherwise the app's initial on a tinted square. */
const AppIcon = memo(function AppIcon({ app, size, large }: { app: App; size: number; large?: boolean }) {
  const uri = large ? app.tile : app.icon;
  const [failed, setFailed] = useState(false);
  const shape = { width: size, height: size, borderRadius: Math.round(size * 0.24) };
  if (uri && !failed) return <Image source={{ uri }} onError={() => setFailed(true)} accessibilityIgnoresInvertColors
    style={[shape, { backgroundColor: app.color ?? palette.background }]} />;
  return <View style={[shape, styles.monogram]}><Text style={[styles.initial, { fontSize: size * 0.42 }]}>{app.title.trim().charAt(0).toUpperCase() || '?'}</Text></View>;
});

export function AppsSheet({ onClose, report, ready, favorites: saved }: {
  onClose: () => void; report: (message: string) => void; ready: boolean; favorites: string[];
}) {
  const [apps, setApps] = useState<App[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(ready);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [arranging, setEditing] = useState(false);
  // Shown at once; the native store echoes the same list back through the remote state.
  const [favorites, setFavorites] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) { setSeen(saved); setFavorites(saved); }
  const [reducedMotion, setReducedMotion] = useState(true);
  const generation = useRef(0);
  const activeAction = useRef(false);
  const scroll = useScrollCues();
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
    return () => { generation.current = token + 1; };
  }, [retry, ready]);

  const byId = new Map(apps.map((app) => [app.id, app]));
  // Favourites the TV no longer lists stay saved (an app may come back) but aren't shown.
  const pinned = favorites.map((id) => byId.get(id)).filter((app): app is App => !!app);
  const save = (next: string[]) => {
    if (!reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setFavorites(next);
    void native?.setFavorites(next).catch((issue: unknown) => { report(errorMessage(issue)); setFavorites(saved); });
  };
  const toggle = (app: App) => {
    void Haptics.selectionAsync();
    save(favorites.includes(app.id) ? favorites.filter((id) => id !== app.id) : [...favorites, app.id]);
  };
  const move = (app: App, by: -1 | 1) => {
    const order = pinned.map((item) => item.id);
    const from = order.indexOf(app.id), to = from + by;
    if (from < 0 || to < 0 || to >= order.length) return;
    order.splice(to, 0, ...order.splice(from, 1));
    save([...order, ...favorites.filter((id) => !byId.has(id))]);
  };
  const editing = arranging && pinned.length > 0;

  const launch = async (app: App) => {
    if (activeAction.current || !ready || editing) return;
    activeAction.current = true;
    const token = generation.current;
    setActing(app.id);
    try {
      await native!.request('ssap://system.launcher/launch', { id: app.id, ...(app.params ? { params: app.params } : {}) });
      if (token === generation.current) onClose();
    } catch (issue) { if (token === generation.current) report(errorMessage(issue)); }
    finally { if (token === generation.current) { setActing(null); activeAction.current = false; } }
  };

  const loaded = ready && !loading && !error;
  const searching = query.trim().length > 0;
  const filtered = searching ? apps.filter((app) => app.title.toLowerCase().includes(query.trim().toLowerCase())) : apps;
  // Sheet content spans min(width, 600) with 24 on each side; tiles keep at least 80 (scaled with text).
  const gap = 8;
  const inner = Math.min(width, 600) - 48;
  const columns = Math.max(3, Math.min(5, Math.floor((inner + gap) / (80 * Math.min(fontScale, 1.6) + gap))));
  const tileWidth = Math.floor((inner - gap * (columns - 1)) / columns);

  const tile = (app: App, index: number) => {
    const busy = acting === app.id;
    const first = index === 0, last = index === pinned.length - 1;
    return <View key={app.id} style={{ width: tileWidth }}>
      <TouchableRipple borderless onPress={() => void launch(app)} onLongPress={() => { void Haptics.selectionAsync(); setEditing(true); }}
        disabled={(!!acting && !busy) || !ready} style={[styles.tile, editing && styles.tileEditing]}
        accessibilityRole={editing ? undefined : 'button'} accessibilityLabel={editing ? `${app.title}, favourite ${index + 1} of ${pinned.length}` : `Open ${app.title}`}
        accessibilityHint={editing ? undefined : 'Long press to rearrange favourites'}
        accessibilityActions={editing ? [{ name: 'earlier', label: 'Move earlier' }, { name: 'later', label: 'Move later' }, { name: 'remove', label: 'Remove from favourites' }] : undefined}
        onAccessibilityAction={(event) => { const action = event.nativeEvent.actionName; if (action === 'remove') toggle(app); else move(app, action === 'earlier' ? -1 : 1); }}>
        <View style={styles.tileBody}>
          <View><AppIcon app={app} size={52} large />{busy ? <View style={styles.busy}><ActivityIndicator size={22} color={palette.text} /></View> : null}</View>
          <Text variant="bodySmall" numberOfLines={2} style={styles.tileTitle}>{app.title}</Text>
        </View>
      </TouchableRipple>
      {editing ? <>
        <Pressable onPress={() => toggle(app)} hitSlop={10} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Remove ${app.title} from favourites`}>
          <Icon source="close" size={14} color={palette.text} />
        </Pressable>
        <View style={styles.moveRow}>
          <IconButton icon="chevron-left" size={18} disabled={first} onPress={() => move(app, -1)} accessibilityLabel={`Move ${app.title} earlier`} style={styles.moveButton} />
          <IconButton icon="chevron-right" size={18} disabled={last} onPress={() => move(app, 1)} accessibilityLabel={`Move ${app.title} later`} style={styles.moveButton} />
        </View>
      </> : null}
    </View>;
  };

  const favouritesSection = <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">Favourites</Text>
      {pinned.length > 0 ? <Button compact icon={editing ? 'check' : 'pencil-outline'} onPress={() => setEditing(!editing)}
        accessibilityLabel={editing ? 'Done arranging favourites' : 'Arrange favourites'}>{editing ? 'Done' : 'Arrange'}</Button> : null}
    </View>
    {pinned.length > 0 ? <View style={[styles.grid, { gap }]}>{pinned.map(tile)}</View>
      : <View style={styles.emptyFavourites}>
        <View style={styles.emptyIcon}><Icon source="star-outline" size={24} color={palette.accentFg} /></View>
        <View style={styles.emptyText}><Text variant="titleMedium">Keep your go-to apps here</Text>
          <Text variant="bodyMedium" style={styles.secondary}>Tap the star next to an app below to pin it.</Text></View>
      </View>}
  </View>;

  const header = (heading: ReactNode) => <>{heading}
    {loaded && apps.length > 0 ? <Searchbar placeholder="Search apps" accessibilityLabel="Search TV apps" value={query} onChangeText={setQuery} style={styles.search} /> : null}
    {loaded && apps.length > 0 && !searching ? favouritesSection : null}
    {loaded && apps.length > 0 ? <Text variant="titleSmall" style={[styles.sectionTitle, styles.listTitle]} accessibilityRole="header">
      {searching ? `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}` : 'All apps'}</Text> : null}
  </>;

  return <Sheet open onClose={onClose} title="Apps" subtitle="Open an app on your TV.">
    {(heading) => <View {...scroll.frameProps} style={styles.scroll}><FlatList {...scroll.props} style={styles.scroll} data={loaded ? filtered : []}
      keyExtractor={(app) => app.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list} extraData={[favorites, acting, editing]}
      ListHeaderComponent={header(heading)}
      renderItem={({ item: app }) => {
        const starred = favorites.includes(app.id);
        return <TouchableRipple onPress={() => void launch(app)} disabled={!!acting || !ready || editing} style={styles.row}
          accessibilityRole="button" accessibilityLabel={`Open ${app.title}`}>
          <View style={styles.rowBody}>
            <AppIcon app={app} size={40} />
            <Text variant="bodyLarge" numberOfLines={2} style={styles.rowTitle}>{app.title}</Text>
            {acting === app.id ? <ActivityIndicator size={20} style={styles.progress} />
              : <IconButton icon={starred ? 'star' : 'star-outline'} iconColor={starred ? palette.accentFg : palette.muted} onPress={() => toggle(app)}
                selected={starred} accessibilityLabel={starred ? `Remove ${app.title} from favourites` : `Add ${app.title} to favourites`} />}
          </View>
        </TouchableRipple>;
      }}
      ListEmptyComponent={!ready ? <View style={styles.empty}><Text>Your TV disconnected. Close this menu and reconnect.</Text></View>
        : loading ? <View style={styles.empty}><ActivityIndicator /><Text style={[styles.secondary, styles.center]}>Loading from your TV…</Text></View>
        : error ? <View style={styles.empty}><Icon source="wifi-alert" size={36} color={palette.muted} /><Text variant="bodyLarge" style={styles.center}>{error}</Text>
          <Button icon="refresh" onPress={() => { setError(''); setLoading(true); setRetry((value) => value + 1); }} disabled={!ready}>Try again</Button></View>
        : <View style={styles.empty}><Icon source="view-grid-outline" size={40} color={palette.muted} />
          <Text variant="titleMedium">{searching ? 'No matching apps' : 'No apps reported'}</Text>
          <Text style={[styles.secondary, styles.center]}>{searching ? 'Try a different app name.' : 'Your TV returned an empty list.'}</Text></View>} />{scroll.cues}</View>}
  </Sheet>;
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 }, list: { paddingBottom: 16 },
  search: { marginHorizontal: 24, marginBottom: 8, backgroundColor: palette.raised },
  section: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  sectionTitle: { color: palette.accentFg }, listTitle: { marginHorizontal: 24, marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { borderRadius: radius.md, backgroundColor: palette.raised, overflow: 'hidden' },
  tileEditing: { borderWidth: 1, borderColor: '#383E4B' },
  tileBody: { alignItems: 'center', gap: 8, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 6, minHeight: 104 },
  tileTitle: { textAlign: 'center', color: palette.text },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#00000080' },
  remove: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: '#383E4B' },
  moveRow: { flexDirection: 'row', justifyContent: 'center' }, moveButton: { margin: 0 },
  emptyFavourites: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: '#383E4B' },
  emptyIcon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accentSoft },
  emptyText: { flex: 1, gap: 2 },
  monogram: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accentSoft },
  initial: { color: palette.accentFg, fontWeight: '700' },
  row: { borderRadius: radius.md, marginHorizontal: 12 },
  rowBody: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, paddingLeft: 12, paddingRight: 4 },
  rowTitle: { flex: 1 }, progress: { margin: 14 },
  empty: { alignItems: 'center', padding: 32, gap: 16 }, secondary: { color: palette.muted }, center: { textAlign: 'center' },
});

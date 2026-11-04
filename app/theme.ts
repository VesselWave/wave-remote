import { MD3DarkTheme } from 'react-native-paper';

// The VesselWave family palette: Wave VPN's dark tokens (blue-black greys, one electric-blue accent),
// shared with the VPN apps and both websites. Paper menus and sheets use the same color roles.
export const palette = {
  background: '#090B10', surface: '#1A1E27', raised: '#222731',
  text: '#ECEEF3', muted: '#9FA6B5', faint: '#6A7182',
  accent: '#2F6BFF', onAccent: '#FFFFFF', accentFg: '#6E9BFF', accentSoft: '#0F1A36',
  power: '#FF5C5C', danger: '#FF5C5C',
  // One look for every TV control while the TV can't take input, whatever its usual fill.
  disabled: '#12151C', onDisabled: '#6A7182',
};

// Shared VesselWave corner scale (same in the VPN apps and both websites): 8 rows and inputs,
// 12 cards and list items, 16 sheets and remote keys, 24 large surfaces such as the touchpad,
// pills for buttons, toggles and cues, circles for round controls.
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const theme = {
  ...MD3DarkTheme,
  // Paper derives its shapes from this: buttons 5x (a pill at 40dp), cards 3x (12).
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.accent, onPrimary: palette.onAccent, primaryContainer: palette.accentSoft, onPrimaryContainer: palette.accentFg,
    secondary: palette.text, onSecondary: palette.background, secondaryContainer: palette.raised, onSecondaryContainer: palette.text,
    background: palette.background, onBackground: palette.text,
    surface: palette.surface, onSurface: palette.text, surfaceVariant: palette.raised, onSurfaceVariant: palette.muted,
    outline: '#383E4B', outlineVariant: '#252A35', error: palette.danger, onError: '#FFFFFF',
    errorContainer: '#221318', onErrorContainer: palette.danger,
    inversePrimary: palette.accentFg,
    elevation: { level0: 'transparent', level1: '#12151C', level2: '#161920', level3: '#1A1E27', level4: '#1D212B', level5: '#222731' },
  },
};

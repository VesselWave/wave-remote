---
name: Wave Remote
description: A familiar dark Android remote with Material setup and menus.
colors:
  background: "#090B10"
  surface: "#1A1E27"
  raised: "#222731"
  text: "#ECEEF3"
  muted: "#9FA6B5"
  faint: "#6A7182"
  accent: "#2F6BFF"
  accent-fg: "#6E9BFF"
  accent-soft: "#0F1A36"
  power: "#FF5C5C"
  disabled: "#12151C"
  on-disabled: "#6A7182"
  primary: "#2F6BFF"
  on-primary: "#FFFFFF"
  primary-container: "#0F1A36"
  on-primary-container: "#6E9BFF"
  secondary: "#ECEEF3"
  outline: "#383E4B"
  outline-variant: "#252A35"
  error: "#FF5C5C"
  on-error: "#FFFFFF"
  error-container: "#221318"
  on-error-container: "#FF5C5C"
  web-primary-hover: "#4A7FFF"
  web-on-primary: "#FFFFFF"
typography:
  headline-large: {fontFamily: sans-serif, fontSize: "32px", fontWeight: 400, lineHeight: "40px", letterSpacing: "0px"}
  headline-small: {fontFamily: sans-serif, fontSize: "24px", fontWeight: 400, lineHeight: "32px", letterSpacing: "0px"}
  title-medium: {fontFamily: sans-serif-medium, fontSize: "16px", fontWeight: 500, lineHeight: "24px", letterSpacing: "0.15px"}
  title-small: {fontFamily: sans-serif-medium, fontSize: "14px", fontWeight: 500, lineHeight: "20px", letterSpacing: "0.1px"}
  body-large: {fontFamily: sans-serif, fontSize: "16px", fontWeight: 400, lineHeight: "24px", letterSpacing: "0.15px"}
  body-medium: {fontFamily: sans-serif, fontSize: "14px", fontWeight: 400, lineHeight: "20px", letterSpacing: "0.25px"}
  body-small: {fontFamily: sans-serif, fontSize: "12px", fontWeight: 400, lineHeight: "16px", letterSpacing: "0.4px"}
  label-large: {fontFamily: sans-serif-medium, fontSize: "14px", fontWeight: 500, lineHeight: "20px", letterSpacing: "0.1px"}
  remote-title: {fontSize: "19px", fontWeight: 500}
  remote-label: {fontSize: "15px", fontWeight: 400}
  remote-ok: {fontSize: "20px", fontWeight: 700}
  web-display: {fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "clamp(3.5rem, 9vw, 6rem)", fontWeight: 780, lineHeight: 0.9, letterSpacing: "-0.035em", fontVariation: "'wdth' 112"}
  web-lede: {fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "clamp(1.125rem, 2vw, 1.3125rem)", fontWeight: 400, lineHeight: 1.375}
  web-body: {fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "17px", fontWeight: 400, lineHeight: 1.5}
  web-action: {fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "19px", fontWeight: 700}
  web-label: {fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "15px", fontWeight: 500}
  web-small: {fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "13px", fontWeight: 400}
rounded:
  row: "12px"
  card: "12px"
  remote-button: "16px"
  sheet: "16px"
  touchpad: "24px"
  round-control: "42px"
  material-button: "20px"
  web-full: "9999px"
  web-card: "24px"
  web-phone-frame: "16px"
  web-phone-screen: "12px"
spacing:
  compact: "4px"
  small: "8px"
  control-gap: "10px"
  medium: "12px"
  inset: "16px"
  card: "20px"
  page: "24px"
  section: "32px"
components:
  remote-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.remote-button}"
    typography: "{typography.remote-label}"
    padding: "0px 4px"
  remote-button-pressed:
    backgroundColor: "{colors.raised}"
  remote-ok:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text}"
    rounded: "{rounded.round-control}"
    typography: "{typography.remote-ok}"
    size: "84px"
  remote-navigation:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.remote-button}"
  button-contained:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.material-button}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.material-button}"
  device-card:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  mode-selected:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.web-full}"
  sheet:
    backgroundColor: "{colors.surface}"
  web-button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.web-on-primary}"
    typography: "{typography.web-action}"
    rounded: "{rounded.web-full}"
    padding: "0px 32px 0px 24px"
    height: "60px"
  web-button-primary-hover:
    backgroundColor: "{colors.web-primary-hover}"
  web-button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.web-full}"
    padding: "0px 20px"
    height: "44px"
  web-button-ghost-hover:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
  web-mode-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.web-label}"
    rounded: "{rounded.web-full}"
    padding: "4px"
  web-mode-toggle-selected:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.web-full}"
    height: "48px"
  web-phone-frame:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.web-phone-frame}"
    padding: "4px"
---

# Design System: Wave Remote

## Overview

**Creative North Star: "The familiar Android remote"**

Keep the remote's control geometry and button order. Colors and corners follow the VesselWave family: Wave VPN's dark tokens (blue-black greys, one electric-blue accent) and one shared corner scale, the same in the VPN apps and both websites. Setup, settings and menus use React Native Paper's Android Material 3 components. PRODUCT.md supplies this binding direction; `app/components/RemoteScreen.tsx` is the reference for the remote, ahead of older saved screenshots.

This is a code-derived record of the Expo implementation, not a runtime visual approval. Sources are `app/theme.ts`, `app/components/`, `App.tsx` and the installed Paper Android theme. Frontmatter uses portable px strings for numeric native dimensions; interpret them as React Native layout units and native text sizes, not browser sizing requirements.

**Key Characteristics:**

- Blue-black surfaces with one blue accent on the central confirmation control.
- Familiar Material forms, lists and modal menus.
- Preserved remote order and generous central controls.

## Colors

### Primary

`accent` is the family blue: the OK control and Paper's `primary` for contained actions. `accent-fg` is the lighter blue for icons, section titles and selection marks on dark surfaces; `accent-soft` (the accent at 16% over the canvas) is its container, as behind the setup logo.

### Secondary

`secondary` is the Paper secondary role and equals `text`. Secondary containers reuse `raised` with `text` foreground.

### Neutral

`background` is the app canvas; `surface` holds remote buttons and sheets; `raised` separates navigation, selected modes and device summaries. `text` and `muted` distinguish primary labels from explanations. `outline` and `outline-variant` belong to the Material field/divider vocabulary. Tonal elevation colors live in the sidecar.

`power` marks power, active mute and disconnected remote status.

`disabled` and `on-disabled` are the one look for TV controls the TV can't take: every key, rocker (with its VOL/CH label), the OK control and the navigation row switch to them, whatever their usual fill. Power keeps its own look whenever it can act, so it stands alone as the way back. The `error` pair (the family danger red) marks Material errors and the explicit Forget TV action.

**The One Blue Rule.** One accent, `#2F6BFF`, everywhere; `accent-fg` is the same hue lightened for text and icons. Values come from Wave VPN's `Theme.kt`; change them there first, then here.

## Typography

Android Paper uses native sans-serif and sans-serif-medium. The implemented setup heading uses headline-large; sheet headings use headline-small. Title-medium identifies sections and devices; title-small labels settings groups. Body-large, body-medium and body-small support instructions, secondary copy and status. Label-large serves Paper buttons. The native app installs no custom display font; the web download site is the only surface with its own face (below).

The remote retains its own title, ordinary label and bold OK sizes. Status and rocker labels are small (12); mode labels use 14. These inherit Paper text defaults unless overridden; do not invent a new type ramp or normalize them into large marketing headings.

**Web download site (`site/`) only.** Inter Variable (`@fontsource-variable/inter`) serves all text, shared with the Wave VPN site; ui-monospace serves only the footer checksum. The `web-*` typography entries in the frontmatter predate the switch and are historical; `site/src/styles.css` is authoritative.

**The Web Face Stays On The Web Rule.** Inter belongs to the browser surface; native screens keep Paper's system faces.

## Layout

The safe-area app contains a centered phone layout capped at 600 native units. Remote side padding is 16; setup and menu content generally use 24. The remote scales its reference geometry from measured safe-area width and height without rearranging its controls. Setup reduces decorative space below 700. Fitting content has scrolling disabled. Overflow shows a native scrollbar and a temporary More below hint with a 28-unit chevron. The hint ignores touches, reserves no space, fades after 2.6 seconds, and disappears immediately on scrolling. There is no permanent More bar.

**The Remote Order Rule.** Keep header → power/input/mute → shortcuts → playback → mode selector → central pad → back/home/TV settings. Volume/channel always stay alongside the vertically stacked Apps/Keyboard shortcuts, including on short screens. Navigation remains fixed below the scrolling area.

The reference D-pad uses 84-unit circular cells with 8-unit gaps; rockers are 84 wide and 144 tall. Reference dimensions scale uniformly between 80% and 100% for the available space. Large text uses scrolling without rearranging shortcuts or rockers. The Buttons/Touchpad selector spans the content width. Sheets cap width at 600, respect the top safe area, and pad their bottom by the larger of 24 or the safe-area inset. Headings and forms scroll together when needed; app/input lists retain virtualization. Keyboard-aware containers keep form actions reachable.

## Elevation & Depth

The custom remote uses tonal layering. Its temporary scroll hint uses native elevation 3; setup notices use Paper Surface elevation 1. The web download site is flat: its phone frame is a surface-toned bezel with a raised one-pixel ring around a canvas-toned screen, and nothing on the page casts a shadow. Sheets separate from the canvas through their surface tone and a translucent black scrim. Preserve the theme's elevation ramp rather than inventing a web shadow system.

## Shapes

One corner scale for the whole VesselWave family (`radius` in `app/theme.ts`): 8 rows and inputs, 12 cards and list items, 16 sheets and remote keys, 24 large surfaces such as the touchpad, pills for buttons, toggles and cues, circles for round controls. Remote keys use 16; D-pad controls are circles and rockers are pills. The mode selector is a pill holding pill choices. Sheets round only their upper corners (16). Paper theme roundness is 4, which makes Paper buttons pills at 40 units and cards 12; it is not a universal 4-unit corner rule.

## Components

- **Remote buttons:** centered text or MaterialCommunityIcons (26), clipped ripple, selection haptic and a raised pressed fill. Disabled controls use the `disabled` fill and `on-disabled` foreground instead of fading, so differently filled controls dim to the same tone. While disconnected the touchpad is replaced by a `disabled` panel; the native pad isn't mounted. Repeat controls expose a hold hint and stop on release or app backgrounding.
- **D-pad and rockers:** adapt their geometry to available space while preserving touch targets. OK carries the blue accent; rocker labels remain muted between plus and minus keys. Native touchpad instructions switch to shorter stacked lines when their measured text cannot fit beside the scroll strip.
- **Mode selector and navigation:** mode choices have a minimum height of 48, with raised selected fill and muted unselected text. Bottom navigation retains raised fill and source order.
- **Material buttons and fields:** contained primary actions, outlined secondary actions and text actions use Paper defaults. IP and keyboard inputs are outlined with labels and HelperText; errors and disabled state remain visible. Forget TV requires its existing confirmation step and error-colored action.
- **Cards and lists:** setup devices use surface cards, settings device summaries use raised cards, and app/input menus use Paper list rows with icons and trailing chevrons or progress. Search uses a raised Searchbar. No chip component is currently implemented.
- **Sheets and feedback:** shared heading, drag-handle silhouette, explicit close action, backdrop dismissal and Android back dismissal. The handle is visual; the implementation does not provide dragging. Modal fade is disabled when reduced motion is enabled. Snackbars expose Dismiss and use a 6500ms duration.

The sidecar's HTML/CSS samples translate selected native controls for the design panel. Browser focus treatment is preview-only; native Paper, ripple, accessibility and gesture behavior remain authoritative.

### Web download site (`site/`)

A single download page and static 404 built inside this world with shadcn/ui primitives. `site/src/styles.css` carries the family token block shared byte-for-byte with the Wave VPN site (blue-black greys, `accent` as shadcn primary, `accent-fg` for links and the focus ring).

- **Download button:** fully rounded, filled OK blue with white `web-action` text and a 24px leading icon; hover lightens to `web-primary-hover`; press scales to 0.98 over 150ms (off under reduced motion). The 404 repeats it at 56px tall.
- **Ghost link button:** fully rounded, 44px, muted 15px semibold text and 20px icon; hover fills `raised` and lifts text to `text`.
- **Mode toggle:** the web mirror of the app's mode selector: a surface pill (4px inset) holding two pill choices of at least 48px with 18px icons; the selected choice fills `raised`. Capped at 300px wide.
- **Phone frame:** the family screenshot frame, as on the Wave VPN site: 16px-radius card with 4px padding, a one-pixel hairline ring and a 12px-radius screen at the screenshot's 720:1447 ratio. Width min(320px, 100vw − 72px) when stacked, min(280px, 32vw) beside the copy from 768px; from 1024px the screen height fits the window so header and footer stay on screen.
- **Screenshot framing and crossfade:** fit the full screenshot inside the screen with 12px of vertical padding so the rounded frame clears the header and bottom navigation buttons. Switching modes fades the outgoing screen to 0 opacity with a 6px blur and the incoming one in, 300ms ease-out; reduced motion removes the transition.
- **Browser surfaces:** dark color-scheme and theme-color canvas, selection in OK blue at 40% under `text`, scrollbar thumb `raised` on the canvas track, focus rings 2px in `primary` (offset 3px from the canvas on buttons, inset on toggle choices).
- **Layout:** the shared family frame (1200px max, 16px side gutters); two columns from 768px (copy column max 36rem, figure on the right); below that the copy column is centered above the figure, never left-aligned beside empty space; hairline rule above the footer.

**The Blue Text Rule.** White on the filled accent measures about 4.5:1, but only about 3.6:1 on hover, so filled blue carries labels of 15px semibold or bigger.

## Do's and Don'ts

### Do:

- **Do** preserve the remote control order, central geometry and landing zone.
- **Do** reuse the family palette, corner scale and Paper theme for new setup or menu surfaces.
- **Do** retain accessible labels, selected/disabled states and reduced-motion handling.
- **Do** build web surfaces from the app palette through the shadcn role mapping, with OK blue as the only filled action.

### Don't:

- **Don't** use stale screenshots to rearrange the current source remote.
- **Don't** replace the remote with a generic Material dashboard.
- **Don't** treat code-derived dimensions or panel samples as runtime visual approval.

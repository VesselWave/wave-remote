# Android phone layout verification

The matrix below records the 0.6.5 compact layout. Version 0.6.6 replaces that arrangement with scaled reference geometry; its verification is recorded in `release-0.6.6.md`.

Tested on 2026-10-20 using the installed release-mode APK on the T3 Pixel emulator
(Android 16/API 36, arm64), with the repository's local mock webOS TV. These are
emulated layout configurations, not separate physical devices or Android versions.
The app supports Android and requests portrait orientation.

## Results

All 54 matrix scenarios passed across nine configurations. Additional checks
passed for a 280 × 653 layout at 130% text with a simulated tall cutout and
three-button navigation, native touchpad movement/clicks, app search filtering,
typed text dispatch, portrait locking, and the scroll hint disappearing.
The touchpad instruction fix was rebuilt and visually checked at 320 × 568.
[Machine-readable results](phone-layout-results.json).

## Configurations

All dimensions below are layout dp. The run uses density 320 (2 physical pixels
per dp), plus the emulator's original 1080 × 2400 / 420 dpi setup-screen check.

- 100% text: 320 × 480, 320 × 568, 360 × 640, 393 × 873, 412 × 915,
  480 × 800, and 600 × 960.
- 200% text: 320 × 480 and 360 × 640.
- Extra narrow check: 280 × 653 at 130% text, tall cutout, three-button navigation.

## Evidence

- [Complete remote at 320 × 568 without scrolling](screenshots/remote-compact-no-scroll.png).
- [Readable native touchpad at 320 × 568](screenshots/touchpad-compact.png).
- [Initial scroll hint](screenshots/scroll-hint-initial.png) and [the same screen after it fades](screenshots/scroll-hint-faded.png).
- [Rename actions above the keyboard at 320 × 480 and 200% text](screenshots/rename-small-large-text.png).
- [Readable scrolling choices at 320 × 480 and 200% text](screenshots/settings-small-large-text.png).
- [Setup input and Connect above the keyboard at 360 × 640 and 200% text](screenshots/setup-large-text.png).

## Reproducing the checks

Build and install the APK following the repository README. Start
`python3 tools/mock_tv.py 0.0.0.0` and connect to `10.0.2.2` from the Android
emulator. This pairs with a synthetic TV and enables the connected screens.
The mock advertises a loopback pointer socket, so forward that port before testing
the touchpad or D-pad:
`adb -s emulator-5554 reverse tcp:3001 tcp:3001`.
Remove the forwarding afterwards with
`adb -s emulator-5554 reverse --remove tcp:3001`.

Use `adb -s emulator-5554 shell wm density 320` and change the physical dimensions
with `adb -s emulator-5554 shell wm size WIDTHxHEIGHT`. At density 320, divide
physical pixels by two to get layout dimensions in dp. Change text size with
`adb -s emulator-5554 shell settings put system font_scale 2.0`.

For every configuration, verify:

1. Verify the complete remote fits at 320 × 568 and larger with 100% text.
   Fitting screens have scrolling disabled and no hint. On the 320 × 480
   and 200% text layouts, verify scrolling actually moves the content. The initial
   More below hint fades after 2.6 seconds and hides immediately on scrolling.
   It never takes space or captures a tap. Reach every D-pad direction and
   activate OK. Back, Home, and TV settings remain fixed with touch targets at
   least 48 dp wide and high.
2. Open Remote settings, change scrolling preferences, open Forget this TV,
   and choose Keep TV. Both preference labels remain readable.
3. Open Your TVs and Rename TV. Show the real software keyboard, scroll to Save,
   and save the unchanged name.
4. Select an input, then open Apps, focus search with the software keyboard
   visible, scroll to an app, and launch it.
5. Open Keyboard with the software keyboard visible, scroll to Send + Enter,
   and activate it.
6. Open Add a TV and focus the IP field. With the real software keyboard visible,
   scroll to Connect and verify its entire bounds are above the keyboard. Dismiss
   the keyboard and return to the remote with Android Back.

If automation uses an invisible IME for text insertion, switch back to a real
keyboard before keyboard layout checks. This run used Gboard:
`adb -s emulator-5554 shell ime set com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME`.
Enable the software keyboard with a hardware keyboard attached if needed:
`adb -s emulator-5554 shell settings put secure show_ime_with_hard_keyboard 1`.

After testing, restore the emulator's original display and text settings:

```sh
adb -s emulator-5554 shell wm size reset
adb -s emulator-5554 shell wm density reset
adb -s emulator-5554 shell settings put system font_scale 1.0
```

## Scrolling behavior

The short-screen remote places narrow volume/channel rockers beside the pad and
Apps/Keyboard in one row. D-pad cells adapt to available height and width while
remaining at least 48 dp. This keeps the full normal-text remote visible on both
320 × 568 and 360 × 640 layouts. Larger layouts retain the spacious arrangement.

Every scrolling surface measures its natural content against its available space.
Fitting content has scrolling disabled. Overflow briefly shows a More below hint with
a 28 dp chevron, plus a persistent Android scrollbar. The hint fades after
2.4 seconds plus a 200 ms fade, or disappears immediately on the first scroll.
It uses no layout space and ignores touches. There is no permanent More bar.

## Issues corrected

- Rename and confirmation forms could put actions below the available sheet
  height without a way to scroll to them. Sheet headings and content now scroll
  together, including when the keyboard is open. App/input lists keep their
  virtualized list and include their headings in that list.
- The setup screen could leave the IP field and Connect button underneath the
  software keyboard on small displays. It now reduces its scrollable area when
  the keyboard opens.
- Sheets could extend into the status bar after the keyboard reduced the available
  height. Their container now reserves the top safe area.
- Large text truncated the Keyboard shortcut between the fixed-width rockers.
  Shortcuts move below the rockers when the available space cannot fit their text,
  and captions can wrap.
- The Buttons/Touchpad mode selector wrapped labels into awkward fragments at
  large text sizes. Its width is bounded by the screen and it places icons above
  labels at larger text scales.
- Scrolling preference segments truncated Traditional at large text sizes.
  Narrow layouts use vertically arranged radio choices.
- The nearby-TV heading and search action now wrap when they cannot fit in one row.
- Native touchpad instructions measured wider than a narrow pointer region.
  They now use shorter stacked lines when the full instructions cannot fit.

## Validation

- Android release-mode build and APK signature verification passed.
- `bun run typecheck`, `bunx eslint app App.tsx`, and all nine Bun tests passed.
- Full-repository `bun run lint` now passes. Release preparation enabled ECMAScript
  2025 parsing for the F-Droid worker's JSON import attributes.
- `./test.sh` passed held-key and preferences tests and the protocol checks through
  certificate pinning and reachability. It then stopped at `ProtocolTest.java:129`:
  this macOS host cannot bind the test’s unconfigured `127.0.0.2` loopback alias
  (`java.net.BindException: Can’t assign requested address`). Later protocol/WOL
  checks were therefore not run. No protocol implementation was changed.
- The test build is `dist/wave-remote-v0.6.4-layout-qa.apk`.

The emulator display, font scale, navigation mode, cutout, and software-keyboard
setting were restored, and the synthetic TV pairing was removed.

## Limits

A local mock verifies navigation and command dispatch, not behavior on a physical
TV. Different Android releases, vendor keyboards, display cutouts, and physical
folding transitions still need device coverage. iOS is not a supported app target.

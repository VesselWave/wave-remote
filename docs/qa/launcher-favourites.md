# Launcher favourites and keyboard QA — 2026-11-14

Android 17 / API 37 arm64 emulator, 1080 × 2400, local mock webOS TV.
Built from `4d428eb` plus the local keyboard alignment fix. Installed the debug-signed APK; replacing the previously installed differently signed test app required removing its synthetic pairing first. This is emulator/mock coverage, not physical TV qualification.

## Verified

- Pair via manual IP, connect, and automatically reconnect after app restart.
- Empty favourites explanation and alphabetized All apps list.
- Add Netflix and YouTube using stars without launching them.
- Arrange favourites; move YouTube before Netflix; boundary arrows disable.
- Restart the app: both favourites and the reordered positions persist.
- Remove Netflix in Arrange, then launch YouTube from its tile. Mock receives the correct app ID.
- Search `net`: only Netflix remains. Search `zzzz`: no-results state.
- Keyboard: empty Send is disabled; Send + Enter remains available. Send transmits text and closes; Send + Enter transmits text then Enter.
- Corrected empty and filled text vertical alignment. Multiline text remains readable and expands the field. Checked the large text-size preset and restored medium afterward.
- Volume up/down, mute/unmute, channel up/down, playback, all D-pad directions, OK, Back, Home and TV settings: expected commands arrive at mock.
- Inputs list and PlayStation 5 selection: correct switchInput command arrives at mock.
- Buttons/Touchpad switching and Settings sheet open correctly.

Screenshots: `screenshots/launcher-favourites/`. Images 07/08 show the original alignment; 13–16 show the corrected build.

## Fix

React Native Paper explicitly top-aligns multiline fields. KeyboardSheet now overrides the native input content style with vertical centering and symmetric 12-unit vertical padding.

## Automated checks

- Typecheck and ESLint pass.
- Bun: 10 tests pass, 51 assertions.
- JVM repeat, preferences (including per-TV favourites/order/forget), and WebSocket suites pass.
- Protocol integration reaches reconnect, certificate pin rejection and reachability checks, then stops with `java.net.BindException: Can't assign requested address` on `127.0.0.2`; remaining cases did not run. macOS has no such loopback alias configured.
- Final debug-signed release-mode APK build succeeds.

## Not verified

- Software keyboard visible/resizing: the automation keyboard is headless. Attempting the Android physical-keyboard settings activity failed because that activity does not exist on this API 37 image, also on diagnostic retry.
- Real TV icon URLs (the mock supplies no icons), TalkBack execution, physical touchpad gestures, BLE/WOL wake, multi-TV switching in the UI, launcher loading/error retries, and app disappearance/reappearance.
- Large text check used the tool's `large` preset, not an extreme accessibility font size.

## Follow-up: icons, On TV marker, preview build — 2026-11-14

Real Pixel 7 (Android 17) with the LG webOS 24 TV, plus the API 37 emulator against the mock TV.

- **Cause of missing icons:** the TV serves launch-point icons at `https://<tv>:3001/resources/…` with its self-signed LG certificate. React Native's image loader failed every one with `CertPathValidatorException: Trust anchor for certification path not found`, so each icon briefly showed its colour square, then fell back to the initial. Plain `:3000` resets the connection.
- **Fix:** icons are now downloaded natively through the TV's pinned certificate (only `/resources/` on the selected TV's port 3001, at most 512 KiB) and cached on disk by URL.
- **Verified on the real phone and TV:** every icon loads. After a force stop, icons appear within about a second because they come from the cache. The app currently open on the TV (YouTube) shows "On TV now".
- **Verified on the emulator with the mock:** icons load, a 404 icon falls back to its initial, favourites and Arrange show the icons, and after launching YouTube it is marked in both the row and the tile.
- **Preview build:** `./build.sh debug` produces Wave Remote Preview (`me.vwave.remote.preview`). It installed beside the release on both devices.
- **Protocol test:** 9 new checks cover fetching through the pin and refusing another pin, an unpinned TV, another host, another port, plain http, paths outside `/resources` and a missing icon. They pass on this Mac; later cases still stop at the missing `127.0.0.2` loopback alias, as above.

Screenshots 17–19 come from the emulator; real-phone screenshots stay out of the repository because they show the TV's installed apps.

## Follow-up: hiding apps and the Arrange redraw bug — 2026-11-14

- **Hide apps:** tested on the emulator with the mock TV. Hiding two apps, one of them a favourite, removed both from All apps and unpinned the favourite, and the footer read "2 hidden apps". This survived a relaunch. Showing one again put it back in the list unstarred, and the count dropped to 1.
- **Arrange → Done bug:** this reproduced on the emulator. Favourite tiles lost their icon and name after Done until the sheet was reopened. The cause was the Arrange border being added and then removed on a clipped, rounded view. The tile now keeps a constant border that only changes colour, and Done, with or without moving a tile, redraws correctly.
- **Prefs tests:** 4 new checks cover hidden apps being saved per TV without blanks or repeats, hiding unpinning a favourite, showing an app again without re-pinning it, and forgetting a TV clearing its hidden list.

Screenshots: 20 (choosing apps to hide), 21 (one app shown again, "1 hidden app" row), 22 (Done after Arrange, fixed).

## Follow-up: launcher layout rework — 2026-11-14

Real Pixel 7 (Android 17) with the LG webOS 24 TV, preview build. The emulator was in use by another session, so this pass was phone-only. Real-phone screenshots stay out of the repository, as above.

- **Fixed header:** the title, close button and search field stay in place while the list scrolls.
- **Edit favourites** (Edit, or a long press on a tile): the search slot becomes a bar with a filled Done, and favourites are listed as rows with up/down arrows and a star that removes. Moving Home Hub above YouTube saved the order and the grid redrew with icons and names after leaving the mode. The first row's up arrow and last row's down arrow are disabled. The sheet keeps its browsing height.
- **Back:** in either mode, the system Back gesture returned to browsing and kept the sheet open.
- **Hide apps:** rows use Material switches. Switching Developer Mode off dimmed it, the bar read "1 hidden", and after Done the list ended in "1 hidden app". Tapping that row opened Hide apps scrolled to the top (it previously stayed at the bottom). Switching it back on restored it.
- **On TV:** YouTube's tile shows an "On TV" pill; its row still reads "On TV now".
- **Search:** "lg" gave 3 results, with the search field still visible above the keyboard.
- **Icons:** after one install the Home Hub icon fell back to its initial although it had loaded before; a failed download now retries once after 1.5 s. On the next launch every icon loaded.
- Favourites and hidden apps on the phone were returned to their earlier state (YouTube only, nothing hidden).

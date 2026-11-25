# Changelog

## Unreleased

- Stays connected to the TV in the background and with the screen off. A notification shows the volume and has volume down, play, pause and volume up buttons, also on the lock screen. The background connection and its notification stop when the TV turns off, when you swipe the app away, or after two minutes of failing to reconnect. Turn it off under Remote settings → Background.
- The first connection asks to allow notifications and to let the app run unrestricted in the background, so Android's battery optimization doesn't cut the connection. Both are optional and shown separately under Remote settings → Background: staying connected works without notifications, which only add the controls, while battery optimization may close the connection on some phones.
- Fixes the connection dropping as "TV stopped responding" after the phone slept: time asleep no longer counts as the TV going silent.

## 0.7.3 — 2026-11-24

- Apps and Inputs menus recover after the TV disconnects during a selection, without needing to close and reopen the menu.
- Opening the app or tapping to reconnect shows “Connecting…” with a spinner while it finds the TV, instead of a red “Disconnected” message. Red now means the connection actually failed, and menus say they’re reconnecting rather than disconnected.

## 0.7.2 — 2026-11-15

- Keeps the TV connection across app switches and checks it on return instead of disconnecting every time.
- Reconnects by checking the saved IP first when the TV has a known device identity; scans the network only if that check fails.

## 0.7.1 — 2026-11-15

- Fixes reconnecting after a router restart changes the TV's IP address. The remote finds the paired TV at its new address without losing its pairing, name, favourites or wake settings.
- Distinguishes LG TVs that share a factory certificate, so another TV receiving the old IP cannot keep the remote stuck on the wrong device. Startup, reconnect and wake retries use the same device discovery.

## 0.7 — 2026-11-14

- New app launcher: pin favourite apps per TV with a star, reorder or remove them under Edit (or a long press on a tile), and search the full list. The title and search stay put while the list scrolls, and the app open on the TV is labelled "On TV".
- Shows the TV's own app icons. The TV serves them over its self-signed connection, so they are fetched through the TV's pinned certificate and cached on the phone.
- Marks the app currently open on the TV as "On TV now".
- Hide apps you never use, per TV: tap Hide apps and switch them off. Hidden apps leave the list, search and favourites; a "hidden apps" row at the bottom brings them back. While editing, Done stays at the top and Back leaves the mode instead of closing the launcher.
- Debug builds are named Wave Remote Preview (`me.vwave.remote.preview`) and install beside the release.
- The keyboard field keeps its text vertically centred.

## 0.6.8 — 2026-11-04

- Volume and channel controls use softly tilted oval press highlights around their icons.
- Buttons/Touchpad press ripples follow the rounded mode choices.

## 0.6.7 — 2026-11-03

- Takes on the VesselWave family look shared with Wave VPN: blue-black surfaces, the same electric blue, one corner scale (pill toggles, 16-unit keys and sheets) and a matching launcher icon.

- Rejects excessively large connection handshake headers instead of letting a peer keep the handshake running with endless short headers.

- Normalizes zero-padded TV IP addresses so manual entry does not create a separate saved TV for the same address.

- Closes a TV connection that sends a fragmented message larger than 16 MiB, preventing unbounded message buffering.

## 0.6.6 — 2026-10-21

- Keeps volume and channel beside the stacked Apps and Keyboard buttons on every screen size.
- Scales the remote to the available screen space and gives the Buttons/Touchpad switch the full width.
- Retains scrolling for larger accessibility text and keeps Back, Home, and TV settings at the bottom.

## 0.6.5 — 2026-10-20

- The remote adapts to shorter screens, keeping controls visible without scrolling where they fit. Volume and channel controls sit beside the pad on compact layouts.
- Menus and setup forms keep their actions reachable above the keyboard and below the status bar.
- Larger text stays readable in shortcuts, mode selection, scrolling preferences, and touchpad instructions.
- Scrolling is enabled only when content overflows. A larger-arrow hint briefly points to more content, then disappears on scrolling or after a moment.

## 0.6.4 — 2026-10-20

- A new Wave icon on the home screen and splash screen, including Android 7–7.1 launchers.

## 0.6.3 — 2026-10-18

- The touchpad's right-edge strip and two-finger scrolling each have their own direction setting, and both start out traditional. Pick one in Remote settings.

## 0.6.2 — 2026-10-17

- A button pressed while the remote is still opening its connection for buttons and the touchpad is no longer sent seconds later, when it could land on something else. If the TV never opens that connection, the next press tries again instead of every button doing nothing until you reconnect.
- Connecting gives up after 5 seconds if the TV stops answering partway, instead of showing "Connecting…" forever.
- Holding a button repeats for at most 10 seconds, so a missed release can't keep turning the volume up.
- A TV that closes the connection while starting up no longer shows "TV certificate changed. Forget the TV and pair again", and the remote keeps trying to reconnect. Only a certificate that really changed asks you to pair again.
- Pairings are left out of Android's device-to-device transfer, as they already were from backups. On a new phone, pair the TV again.

## 0.6.1 — 2026-10-17

- No changes to the app itself: a clearer store description and documentation.

## 0.6 — 2026-10-17

- Reconnects on its own when the TV comes back, including when it was turned on with its own remote, while the app is open. A TV in standby doesn't make the remote flash "Connected".
- While the TV is off or disconnected, every control dims to the same color and only the power button stays lit.
- The touchpad's hint text no longer shows through "Connect to use the touchpad".
- Release builds use Node.js and Gradle, with normalized native paths and preserved signing alignment for F-Droid rebuild verification.

## 0.5 — 2026-10-16

- The APK is about 13 MB, down from 31 MB.
- Asks for fewer Android permissions: no more "display over other apps" or storage access, which the app never used.
- A TV the app has already paired with over an encrypted connection is never contacted unencrypted again. Older TVs that only support unencrypted connections still work.
- Looking for TVs only reads device details from the device that answered.
- Builds no longer contain the build machine's network address.

## 0.4 — 2026-10-16

- Remembers more than one TV. Use the switch button next to the remote's settings to change TVs or add another; each TV keeps its own pairing and wake-up details. Forgetting a TV only removes that one.
- Your existing pairing carries over.
- Give a TV its own name on this phone, to tell apart several of the same model: tap the pencil next to it in the TV list. Leave it empty to go back to the TV's name.
- The `.N` IP shorthand now uses the subnet of a TV the app already knows.
- The input list says “Connected” under a port with something plugged in, or “Connected, no signal” if that device sends nothing, instead of the port’s ID.

## 0.3 — 2026-10-16

- Renamed from TV Remote to Wave Remote. The package ID is now `me.vwave.remote` and the download site is [remote.vwave.me](https://remote.vwave.me).
- Because the package ID changed, this version installs alongside 0.2 instead of updating it. Pair your TV again, then uninstall the old app.

## 0.2 — 2026-10-15

The remote is rebuilt with Expo and React Native, keeping the same layout and protocol engine.

- Icons on the remote's buttons, in the outline style of LG ThinQ's TV control widget: inputs, mute/unmute, apps, keyboard, channel up/down, the Buttons/Touchpad switch, back, home and TV settings. Larger buttons keep a short caption.
- Material setup, settings, app and input pickers, and keyboard sheets. Apps are searchable.
- Wider volume and channel rockers. The touchpad fills the space below the controls, with a wider scroll grip.
- Hold-to-repeat stops when the app goes to the background. Haptic feedback on presses.
- Runs on Android 7.0 or newer (was 9). The APK is now about 30 MB, arm64 only.
- Updates 0.1 in place and keeps your pairing.

## 0.1 — 2026-10-15

First standalone public preview release.

- Discover and pair with LG webOS TVs on your local network.
- D-pad with hold-to-repeat, touchpad, dedicated scroll strip, and two-finger scrolling.
- Natural and traditional scroll directions, saved between sessions.
- Volume, mute, channels, media controls, inputs, apps, and keyboard text entry.
- Wake-on-LAN and Bluetooth LE wake-up on supported TVs.
- Local certificate pinning and saved pairing; no account or cloud service.
- Signed universal APKs, SHA-256 checksums, and certificate details on releases.

Requires Android 9 or newer. Tested on LG 65UT7570PUB with webOS 24 and Pixel 7;
other models and firmware versions may differ. See the README for wake settings.

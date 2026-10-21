# Wave Remote 0.6.6 release verification

Verified on 2026-10-21 with the production-signed APK, an Android 16 Pixel emulator,
and the local mock webOS TV. No physical phone or real TV was available for this run.

- The final APK installed over an earlier production-signed 0.6.6 test APK and retained its mock TV pairing.
- At the default 1080 × 2400 / 420 dpi configuration, Buttons and Touchpad modes keep volume/channel beside vertically stacked Apps/Keyboard, above playback and the full-width mode switch. Footer navigation stays at the bottom.
- At 360 × 640 dp, both modes retain the same arrangement; no compact branch moves rockers beside the pad or shortcuts into one row.
- At 360 × 640 dp and 200% text, captions remain readable and the remote scrolls to the remaining controls while footer navigation stays fixed.
- D-pad OK dispatched ENTER to the mock TV. Switching Buttons/Touchpad retained the layout.
- The APK bundle matches the current RemoteScreen and RemoteButton build sources.
- Typecheck, lint, all nine Bun tests, lockfile consistency, Java preference/held-key tests, and protocol tests passed. Site typecheck passed.
- Production certificate, v2/v3 APK signatures, 16 KB ZIP alignment, and byte-identical signature copying passed tools/verify-fdroid.sh.

Evidence: [default buttons](screenshots/0.6.6/buttons-default.png),
[default touchpad](screenshots/0.6.6/touchpad-default.png),
[360 × 640 buttons](screenshots/0.6.6/buttons-360x640.png),
and [360 × 640 touchpad](screenshots/0.6.6/touchpad-360x640.png).

The website and store screenshots are fresh emulator captures with the mock TV,
not captures from a physical phone or generated artwork. The 0.6.5 matrix in
phone-layouts.md documents the previous compact layout and does not certify this release.

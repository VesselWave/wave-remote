# Wave Remote 0.6.8 release verification

Verified 2026-11-04 UTC.

- Tag v0.6.8 points to f49746f. GitHub Actions run 41788501716 passed typecheck, lint, all 10 Bun tests, lockfile consistency, Java tests and the full protocol suite on Linux.
- Local typecheck, lint, app tests, lockfile consistency, debug build, and site typecheck/build passed. The local protocol suite reached the existing macOS limitation binding the unconfigured 127.0.0.2 loopback alias; the complete Linux suite passed.
- Android 17 arm64 emulator: volume/channel held feedback uses tilted ovals, and both mode ripples remain clipped to their pill shapes. Full rocker ends remain tappable and held repeats still dispatch to the mock TV.
- Refreshed app/store/site screenshots from the 0.6.8 debug APK and regenerated OG artwork. All pressed-state evidence uses direct PNG screenshots. Earlier video-derived images were darker; all four replacements retain the native surface RGB (26, 30, 39), matching #1A1E27.
- Download site deployed. Live screenshots and OG bytes match committed assets.
- No physical phone or real TV was available; emulator and mock-TV checks do not qualify physical-device/TV behavior.
- Published APK checksum passed; apksigner verified the production signature and 16 KB ZIP alignment passed. Certificate SHA-256 a2a5c53e76ebefe4c0c5b288904a813dc3d2a61e3802ac8066466167913ed69c matches 0.6.7.
- Installed the published 0.6.7 APK on the second Android 17 emulator, confirmed its existing mock-TV pairing, then installed the published 0.6.8 APK with `adb install -r`. Android accepted the update, pairing persisted, and the app reconnected without a pairing prompt. Held Volume up dispatched repeats and changed the subscribed volume; Touchpad mode switched successfully. Installed versionName is 0.6.8 and versionCode is 10020.
- Live /latest.json reports 0.6.8 and the matching APK hash; /download redirects to the versioned 0.6.8 GitHub asset.
- F-Droid regenerated and deployed with its existing repository key. fdroidserver verified live entry.jar against pinned fingerprint 47841BF725DA7B106B2D05DF097E4898C7B5576411804A23D6A5505C5AD17933 and the referenced index hash. Its live index includes 0.6.8 (10020) with the same APK hash. Following the public F-Droid APK redirect downloaded bytes identical to GitHub.
- As with 0.6.7, the local macOS unsigned rebuild did not reproduce the Linux CI release bytes: tools/verify-fdroid.sh failed the signature-copy integrity comparison. The published APK’s signature verifies, but independent byte-identical rebuild verification remains unconfirmed.

Production APK SHA-256: bd073edf862050b66f4f862cf51666bbbdbe510d9c576449f143c6e16b50a14f.

# Wave Remote 0.6.7 release verification

Verified 2026-11-04 UTC (2026-11-03 America/Chicago).

- GitHub Actions run 41780692020 passed typecheck, lint, all 10 Bun tests, lockfile consistency, Java tests, and protocol tests, then built and published the production-signed APK from tag v0.6.7 (50116a5).
- Local typecheck, lint, Bun tests, lockfile consistency, debug build, and site typecheck/build passed. The local protocol suite passed through fragmentation, pairing, pointer recovery and certificate checks, then failed binding 127.0.0.2: macOS does not configure that loopback alias. The complete Linux CI suite passed.
- Android 17 arm64 emulator: a fresh debug install connected to the mock TV using 010.000.002.002. Buttons and Touchpad screenshots were refreshed from that build. No physical phone or real TV was available.
- Installed published production 0.6.6, paired the mock TV, then installed published 0.6.7 with adb install -r. Android accepted the update, retained pairing and reconnected. ENTER reached the mock pointer socket after forwarding its loopback port to the host.
- Downloaded GitHub APK checksum passed. apksigner verified v2/v3 signatures and one signer, matching 0.6.6 certificate SHA-256 a2a5c53e76ebefe4c0c5b288904a813dc3d2a61e3802ac8066466167913ed69c. 16 KB ZIP alignment passed.
- Independent local macOS debug/unsigned rebuild did not reproduce the Linux release bytes: tools/verify-fdroid.sh failed signature-copy integrity comparison. This does not invalidate the published APK signature; byte-identical independent rebuild verification remains unconfirmed for this release.
- Download site deployed; live /latest.json reports 0.6.7 with matching SHA-256 and /download redirects to its GitHub APK. Screenshots and OG artwork match committed files.
- F-Droid repository regenerated and deployed using the existing key. fdroidserver verified live entry.jar against pinned fingerprint 47841BF725DA7B106B2D05DF097E4898C7B5576411804A23D6A5505C5AD17933 and verified its referenced index hash. Live index includes 0.6.7 (10019) with matching APK hash. Following the public APK redirect downloaded bytes identical to GitHub.
- An obsolete, unmapped local wave-vpn-v0.1.apk was moved out of fdroid/repo before regeneration; existing mapped VPN releases were retained.

Production APK SHA-256: 5a7b861ee6682dcc4be8067b1b294515e44127cef35761a43cb05853e38825bb.

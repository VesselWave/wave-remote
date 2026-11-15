# Wave Remote 0.7 release verification

- Version 0.7, Android version code 10022; tagged source `502786a327ab006dc08a1f3f7943aea165e1d9dc`.
- CI checks and signed packaging passed: https://github.com/VesselWave/wave-remote/actions/runs/43677960820.
- Local checks: 15 publisher unit tests, 18 Bun tests, typecheck, lint, and the complete Java/mock-TV protocol suite passed. Protocol fixtures now run on standard localhost on macOS and Linux without privileged aliases.
- The coordinator completed GitHub publication, pinned OpenPGP/checksum and APK identity verification, immutable R2 uploads/read-back, signed F-Droid v1/v2 verification, public metadata push, R2 pointer promotion and the live website APK hash check.
- GitHub, the site and the signed F-Droid index agree on APK SHA-256 `13183fe1c4752c4e0380c2cdb7b4531c6bc47a5c1bc653943f882bb2b4859a32`.
- The production APK installed in place on the physical Pixel 7 (Android 17) with `adb install -r`, retaining the selected TV, pairing and Touchpad mode. Package Manager reports 0.7 / 10022.
- After relaunch it connected to the saved LG webOS UT7570PUB without a pairing prompt and displayed volume 16. The launcher loaded the TV’s app names and icons. Adding/removing a favourite updated the launcher; the original empty favourites list was restored.
- This device check covered installation, retained pairing, connection, icons and favourite toggling. It did not re-test every launcher interaction or change TV playback, power or volume.
- OpenPGP CI secrets are provisioned in the tag-restricted `release` environment. Ordinary future releases need no local keychain access.

Use the default coordinator command to plan the next version, review its JSON,
then apply the same plan. Version-specific default state selection prevents a
completed release from being mistaken for a new one. Resume an interrupted
publication with its existing state; do not recreate tags or replace artifacts.

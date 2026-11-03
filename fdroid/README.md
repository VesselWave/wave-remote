# VesselWave F-Droid repository

Production: https://f-droid.vwave.me

Add to F-Droid:

https://f-droid.vwave.me/fdroid/repo?fingerprint=47841BF725DA7B106B2D05DF097E4898C7B5576411804A23D6A5505C5AD17933

The Worker serves signed indexes, icons, and screenshots as Workers Static Assets.
APK requests redirect to immutable versioned assets in each app's GitHub Releases.
Static asset requests do not invoke the Worker; APK redirects use the free
Worker request allowance. No APKs or signing keys are uploaded to Cloudflare.

## Update and deploy

Requires Python, fdroidserver 2.4.5, JDK 17+, the Android SDK, and the existing
private `config.yml` and keystore. On Python 3.13, fdroidserver also needs
`setuptools<81`. Keep signing material private and back it up securely. Always
reuse this repository key so clients continue to trust updates.

1. Publish the signed APK to its app's GitHub Release. Never replace a published APK.
2. Add its `/fdroid/repo/<filename>.apk` path and versioned GitHub URL to
   `downloads.json`. Update app descriptions in `metadata/` as needed.
3. From the project root, with Java and fdroid on PATH:

   ```sh
   python3 fdroid/prepare.py
   bun site/node_modules/wrangler/bin/wrangler.js deploy --config fdroid/wrangler.jsonc
   ```

`prepare.py` downloads missing APKs, regenerates signed indexes, verifies indexed
APK hashes and download mappings, and stages only public files into `assets/`.
It also requires an indexed icon for each app and verifies the icon hashes.
Store PNG icons under `metadata/<package-id>/en-US/images/icon.png`: adaptive
launcher icons alone may not be extracted by fdroidserver. Wave Remote's icon
comes from the app's Fastlane metadata; Wave VPN's PNG is rendered from
`icons/wave-vpn.svg`, which preserves its Android launcher artwork.
New releases currently require running this update command; there is no automatic
release synchronization. Previously indexed APKs remain available until explicitly
removed from `repo/` and `downloads.json`.

The repository signing fingerprint is distinct from each Android app's signing
certificate. APKs retain their original signatures, allowing updates over existing
installations signed by the same app key.

If Android reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, an installed copy uses
a different app signing key. The first Wave VPN production release cannot update
the earlier debug build. Remove the debug copy from every Android user/profile
where it is installed before installing the release; uninstalling clears that
profile's app data. Keep the production signing key for all future updates.

## Verified releases — 2026-11-03

- Wave Remote 0.6.6 (10018): existing production APK and certificate retained.
- Wave VPN 0.1.0 (3): existing experimental production APK from
  `VesselWave/wave-vpn-mobile`. GPL-3.0-or-later; see its release notes for
  observed DNS exposure and unverified protection scopes. The repository
  description carries the warning; this publication adds no privacy qualification.
- Removed the obsolete VPN 0.1 development APK and its dead redirect to the
  retired `wave-vpn-android` repository. It used certificate SHA-256
  `51a28caa7a4fca244eff324168cd8e07de9b07e036e59155932c788d6c4c5490`.
  Production 0.1.0 retains the app's documented release certificate
  `29950a5756876759b28984a0e6b44a276efd948f8e7008c3fff471d4ad418821`.
  Android cannot update across these identities; follow the migration warning above.

These are the latest published releases, not new builds of unreleased commits.
The separate `fdroiddata` checkout is an upstream metadata workspace and does not
publish this maintainer-operated repository.

Validation after deployment:

- fdroidserver 2.4.5 verified the live `entry.jar` against the pinned repository
  fingerprint, then verified the referenced `index-v2.json` SHA-256.
- Both public APK routes returned HTTP 302 to their versioned GitHub assets;
  following redirects without authentication returned HTTP 200 and exact bytes.
- `apksigner verify --print-certs` passed on both downloaded APKs; production
  certificates match the identities above and Remote's prior indexed releases.
  `zipalign -c -P 16 4` passed for the staged APKs.
- VPN's trusted OpenPGP manifest signature and every release artifact checksum
  passed `android/scripts/verify-release.sh`; Remote's release checksum passed.
- Live APK SHA-256:
  - VPN: `5db2792df49e77e3aafbc3591036022b3bbd3f7c123e128f6ae1806f9c1f4943`
  - Remote: `10a71629ea7d44e9e761b33086348124a5cb3751fc51816226d30e1e7f1ca9e6`
- Repository key, app keys and release APK bytes were not changed. No app code
  was changed or rebuilt; Kotlin/Rust checks and device qualification were not
  rerun for this metadata/deployment update. No website files were changed.

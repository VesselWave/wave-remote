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
New releases currently require running this update command; there is no automatic
release synchronization. Previously indexed APKs remain available until explicitly
removed from `repo/` and `downloads.json`.

The repository signing fingerprint is distinct from each Android app's signing
certificate. APKs retain their original signatures, allowing updates over existing
installations signed by the same app key.

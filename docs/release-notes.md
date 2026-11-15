Wave Remote 0.7.1

- Fixes reconnecting after a router restart changes the TV's IP address. The remote finds the paired TV at its new address without losing its pairing, name, favourites or wake settings.
- Distinguishes LG TVs that share a factory certificate, so another TV receiving the old IP cannot keep the remote stuck on the wrong device. Startup, reconnect and wake retries use the same device discovery.

Installs over 0.7 and keeps TV pairings and settings. Uses the existing production signing key.

Check the download with `sha256sum --check wave-remote-v0.7.1.apk.sha256`. The release also includes OpenPGP-signed SHA256SUMS, source and provenance.

Setup: https://github.com/VesselWave/wave-remote#readme. Not affiliated with LG.

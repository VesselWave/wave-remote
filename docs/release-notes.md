Wave Remote 0.10

- New app launcher: pin favourite apps per TV with a star, reorder or remove them under Edit (or a long press on a tile), and search the full list. The title and search stay put while the list scrolls, and the app open on the TV is labelled "On TV".
- Shows the TV's own app icons. The TV serves them over its self-signed connection, so they are fetched through the TV's pinned certificate and cached on the phone.
- Marks the app currently open on the TV as "On TV now".
- Hide apps you never use, per TV: tap Hide apps and switch them off. Hidden apps leave the list, search and favourites; a "hidden apps" row at the bottom brings them back. While editing, Done stays at the top and Back leaves the mode instead of closing the launcher.
- Debug builds are named Wave Remote Preview (`me.vwave.remote.preview`) and install beside the release.
- The keyboard field keeps its text vertically centred.

Installs over 0.6.8 and keeps TV pairings and settings. Uses the existing production signing key.

Check the download with `sha256sum --check wave-remote-v0.10.apk.sha256`. The release also includes OpenPGP-signed SHA256SUMS, source and provenance.

Setup: https://github.com/VesselWave/wave-remote#readme. Not affiliated with LG.

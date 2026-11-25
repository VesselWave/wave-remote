Wave Remote 0.7.4

- Stays connected to the TV in the background and with the screen off. A notification shows the volume and has volume down, play, pause and volume up buttons, also on the lock screen. The background connection and its notification stop when the TV turns off, when you swipe the app away, or after two minutes of failing to reconnect. Turn it off under Remote settings → Background → Stay connected.
- The first connection asks to allow notifications and to let the app run unrestricted in the background, so Android's battery optimization doesn't cut the connection. Both are optional: staying connected works without notifications, which only make the controls visible, while battery optimization may close the connection on some phones. Remote settings → Background shows each one in a blue card with Allow while it is missing; unrestricted battery use is always shown.
- Settings switches move once when tapped instead of flickering back before they settle.
- Apps, Inputs and Keyboard open with one smooth fade instead of flickering.
- Fixes the connection dropping as "TV stopped responding" after the phone slept: time asleep no longer counts as the TV going silent.

Check the download with `sha256sum --check wave-remote-v0.7.4.apk.sha256`. The release also includes OpenPGP-signed SHA256SUMS, source and provenance.

Setup: https://github.com/VesselWave/wave-remote#readme. Not affiliated with LG.

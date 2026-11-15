# DHCP address recovery — 2026-11-14

Paired TLS TVs are rediscovered automatically while the app is in the foreground,
including during wake retries. The saved SHA-256 certificate pin authenticates the
new address before any pairing key is sent. Existing installs already have that
pin; they need no additional pairing to enable recovery. The old IP is only a
cached address. Recovery transfers the complete saved TV record in one preferences
transaction. If two saved TVs exchange addresses, both records survive.

SSDP searches each active IPv4 multicast interface, avoiding dependence on the
VPN or virtual adapter owning the default route. Discovery names and Bluetooth
addresses are not trusted as authentication. The app continues retrying when the
old address presents a different certificate, while preserving the original pin.

## Verification

- Android ARM64 preview APK built successfully on the Mac.
- Android 17 / API 37 emulator: installed the final APK as an update, paired a
  local mock, stopped the mock, relaunched while it was offline, then restarted
  the mock. The app reconnected automatically with its stored client key and no
  pairing prompt. The connected UI and volume control were verified.
- App tests: 13 passed; TypeScript and ESLint checks passed.
- Full Java/protocol suite passed on the devbox Linux VM, including discovery,
  certificate rejection, credential-free identity probes, pairing, pointer input,
  legacy transport, timeout handling and Wake-on-LAN.
- Preferences regressions cover address movement, exchanged saved addresses,
  persistence, pairing keys, pins, labels, favourites, hidden apps and wake data.
- `tests/run_recovery.sh` passed in isolated Linux network namespaces. The actual
  client uses multicast SSDP, fetches the description, verifies TLS, moves saved
  preferences and reconnects over SSAP without entering PAIRING. Both an offline
  old address and an old address serving a different certificate were tested.

To repeat on a Linux VM with Java, Python, openssl, iproute2 and passwordless sudo:

```sh
./test.sh
./tests/run_recovery.sh
```

The network test creates temporary namespaces and removes them and their servers
on exit. It does not alter the VM's existing LAN addresses or routes.

## Limits

No physical TV was used. The Mac process cannot reach LAN/multicast destinations
(`No route to host`); the VM's normal network also filters multicast responses.
The isolated network test avoids those environmental restrictions and exercises
the complete network recovery path. The Android emulator uses a local mock via
ADB TCP forwarding; it does not reproduce a router's multicast network.

Automatic address relocation requires an existing TLS certificate pin. Very old
TVs paired only over plaintext port 3000 retain their existing connection behavior.
A sleeping TV must wake and advertise itself before discovery can find its new
address. Recovery also requires SSDP to pass between phone and TV; a factory reset
or changed TV certificate still needs the user to establish trust again.

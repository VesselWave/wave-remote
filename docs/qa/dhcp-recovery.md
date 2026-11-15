# DHCP address recovery — 2026-11-14

Paired TLS TVs are rediscovered automatically while the app is in the foreground,
including during wake retries. Discovery matches the saved device UUID or
Bluetooth address before checking the saved SHA-256 certificate pin. Older installs without those identifiers use
a unique matching TV name to migrate; duplicate names are never guessed.
Existing installs already have that pin; they need no additional pairing to enable recovery. The old IP is only a
cached address. Recovery transfers the complete saved TV record in one preferences
transaction. If two saved TVs exchange addresses, both records survive.

SSDP searches each active IPv4 multicast interface, avoiding dependence on the
VPN or virtual adapter owning the default route. The TLS pin remains required for
TLS TVs, but it is not a unique device identifier: real LG TVs can share it.
The app continues retrying when the old address presents a different certificate, while preserving the original pin.

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

The initial 2026-11-14 checks used no physical TV. See the real-TV follow-up below. The Mac process cannot reach LAN/multicast destinations
(`No route to host`); the VM's normal network also filters multicast responses.
The isolated network test avoids those environmental restrictions and exercises
the complete network recovery path. The Android emulator uses a local mock via
ADB TCP forwarding; it does not reproduce a router's multicast network.

Automatic address relocation requires an existing TLS certificate pin. Very old
TVs paired only over plaintext port 3000 retain their existing connection behavior.
A sleeping TV must wake and advertise itself before discovery can find its new
address. Recovery also requires SSDP to pass between phone and TV; a factory reset
or changed TV certificate still needs the user to establish trust again.


## Real-TV follow-up — 2026-11-15

The production Pixel 7 app was stuck on 192.168.86.127 after its paired UT7570PUB
moved to 192.168.86.29. Discovery identified .127 as a different model (U850SA).
Both endpoints presented the same TLS certificate. The original resolver accepted
the old address solely because its certificate matched, so it never looked for
the moved TV. This case was missing from the original mock tests.

The resolver now discovers first, prefers the saved device UUID or Bluetooth
identity, and uses a unique TV-name match for older installations. It checks the
certificate after selecting the device, rejects ambiguous names, and learns the
UUID on successful connections. Startup and explicit reconnects use this same
resolver before sending a stored key.

On the real Pixel, a temporary preview QA build moved the existing paired record
from .29 back to .127 during startup. The revised resolver restored .29 and
connected to the UT7570PUB without entering pairing. This temporary test setup is
absent from the source changes and final preview APK. Volume up changed the TV
from 12 to 13, and volume down restored 12. The final preview APK was installed
and reconnected successfully. Production 0.7 was left installed with its data
unchanged; it needs the patched production build to gain this fix.

Protocol regressions cover two discovered candidates sharing a real TLS
endpoint/certificate, UUID identity despite name changes, existing Bluetooth
identity, wrong pins, missing identities and ambiguous duplicate names. The
complete localhost protocol suite and 18 app tests passed, as did typecheck and
lint.


### Direct saved-data test on the Pixel

Repeated by editing Preview's actual `shared_prefs/tv.xml` while the app was
stopped. A temporary debuggable APK, signed with the existing preview key, allowed
`run-as` access. The selected host, saved-host list and per-TV preference prefix
were changed from .29 to .127; the pairing key, certificate pin and device identity
were retained. Reading the file back confirmed .127 before any launch.

The normal, non-debuggable preview APK was then reinstalled **before launch**.
It rediscovered .29 and connected without pairing. Your TVs displayed .29 as the
selected address. A subsequent preferences read confirmed .29 persisted, .127 was
removed, and the pairing key and certificate pin were byte-for-byte unchanged.
The normal preview APK was restored after verification; production was untouched.

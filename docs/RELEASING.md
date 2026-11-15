# Shipping Wave Remote

## Signing identity

Keep the same signing key for every release: Android requires it for in-place updates.
Back up the keystore and its passwords securely outside this repository. CI secrets
cannot be downloaded later. Never commit a keystore, password, or `.env` file.

The initial release preserves the private signing identity of the original development
APK, rewrapped with a random password. It is held locally under
`~/.local/share/wave-remote/` and in the repository's Actions secrets. Losing that private
key prevents compatible updates to installed copies.

For a fork, generate your own signing identity (do not reuse the original project's key):

```sh
keytool -genkeypair -keystore /private/path/release.keystore \
  -alias waveremote -keyalg RSA -keysize 4096 -validity 10000
```

Configure these GitHub Actions repository secrets:

| Secret | Value |
| --- | --- |
| `RELEASE_KEYSTORE_BASE64` | Base64-encoded keystore file, without line wrapping. |
| `RELEASE_KEY_ALIAS` | Key alias in that keystore. |
| `WAVEREMOTE_STORE_PASSWORD` | Keystore password. |
| `WAVEREMOTE_KEY_PASSWORD` | Key password (often the same as store password). |

Use `gh secret set` with stdin to avoid passwords in command history. For example:

```sh
base64 -w 0 /private/path/release.keystore | gh secret set RELEASE_KEYSTORE_BASE64
```

GitHub documents [repository secrets and base64 binary blobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).
The build uses Android's [apksigner](https://developer.android.com/tools/apksigner)
to sign and verify every APK, including the public certificate fingerprint.

## Local release build

Set `RELEASE_KEYSTORE`, `RELEASE_KEY_ALIAS`, `WAVEREMOTE_STORE_PASSWORD`, and
`WAVEREMOTE_KEY_PASSWORD` in a private shell environment, then run:

```sh
./test.sh
./build.sh release
```

The build uses the Node.js version in `.node-version` and invokes the installed
Expo CLI directly. For release packaging, install dependencies with
`npm ci --ignore-scripts --no-audit --no-fund`, as the F-Droid recipe does.
Development dependency management and app tests use Bun. The CI checks and release
packaging run in separate jobs; the packaging job does not install Bun.

Release signing preserves ZIP alignment and disables legacy v1/JAR signatures.
The minimum Android version is 7.0 (API 24), which supports the v2/v3 signatures.
Removing unnecessary v1 entries also avoids Python 3.13 ZIP-flag changes during
F-Droid signature copying. Use [the F-Droid verification script](../tools/verify-fdroid.sh)
against each production release and independent rebuild before publication.

The release path never creates or substitutes a signing key. Debug builds use a
separate cached key and are named Wave Remote Preview with the package ID
`me.vwave.remote.preview`, so they install beside the release (with their own
pairings) instead of failing its signature check. The release package ID remains
`me.vwave.remote`.

## One release command

Use the standalone coordinator for the entire release: GitHub, the signed F-Droid
repository and R2 downloads, public metadata, and the live download site. It does
not depend on the Wave VPN checkout.

Before planning, finish device/TV QA and update the `## Unreleased` changelog.
Refresh screenshots only when the interface has changed. Commit and push the
reviewed source and artwork to `main`; the coordinator requires clean `main`
matching `origin/main`. It prepares the next patch version, increments
`VERSION_CODE`, dates the changelog, and generates release notes and a store
summary. Review all generated file contents in the saved JSON plan. A long store
summary links to the full notes rather than silently truncating a feature claim.

```sh
python3 tools/release.py --state .release-state/remote-0.6.9.json
# Review the JSON plan, then publish an authorized release:
python3 tools/release.py --state .release-state/remote-0.6.9.json --apply --background
# Read only when someone requests status:
python3 tools/release.py --state .release-state/remote-0.6.9.json --status
```

Without `--state`, the command selects an unfinished matching plan or creates a
version-specific state for the next patch. It does not reuse a completed release.
`--status` without `--state` reads the newest background job report.

Specify `--version X.Y.Z` while planning to override the next patch. The state
filename is your choice; always use a fresh file for a later release. Reuse the
same file to resume an interruption. State pins the source commit and generated
files; later source changes stop publication. Do not edit a running plan.

The coordinator:

1. Checks F-Droid tooling/configuration, signing-secret names and the site build
   before pushing any tag.
2. Commits/pushes the planned version, changelog and notes, then an annotated tag.
3. Waits for the existing release CI, downloads the artifacts, verifies the pinned
   OpenPGP signature and every manifest hash, and validates the actual APK's
   production certificate, package, version/code and 16 KB ZIP alignment. It
   checks provenance against the planned commit.
4. Mirrors **all** GitHub release artifacts under `remote/vVERSION/` in R2,
   reads them back to verify hashes, and writes an immutable readiness manifest.
   Publishes the verified APK through `fdroid/prepare.py`, reusing existing app
   and repository keys. This updates recommended versions, signs indexes and
   uploads immutable R2 APKs with read-back hash verification. It deploys the
   F-Droid Worker and verifies live signed v1/v2 indexes, recommendation and
   public APK bytes.
5. Commits/pushes the public download mapping and F-Droid metadata. The publisher then promotes
   `remote/latest.json` in R2. The site reads this pointer directly; releases need
   no website sync Action, data commit or redeployment. Completion requires `/latest.json` to show the version and hash and
   `/download` to redirect to the same-origin R2 APK, whose public bytes are also verified.

Background launch returns `started`, **not published**. The detached Python
worker retries routine CI/site cache waits without LLM calls. Agents must hand
back after launch: do not poll, schedule checks, or keep a monitoring agent.
Status, blockers and logs live beside the state as `.job.json` and `.log`.
There is no automatic notification; keep the machine running. After interruption,
resume the same state. Foreground `--apply` is available to terminal operators;
`--timeout` bounds each foreground wait (default 5400 seconds). Exit 3 means
routine waiting; exit 2 means a blocker. Failed CI stops for repair instead of
being treated as routine waiting. Completed state is a no-op on resume.

Only one Remote coordinator may run at a time. The F-Droid repository is shared
with VPN: do not run their publishers simultaneously. If a failed deployment or
stale cache blocks progress after GitHub publication, fix it and resume the same
state. Never move published tags, replace release assets or rotate signing keys
as a retry strategy. Device/TV tests remain a maintainer qualification step;
the coordinator does not claim to automate them.

### Publisher prerequisites

The machine needs Python 3, Git, authenticated `gh`, Bun, JDK and Android SDK
build-tools 36.0.0 (`ANDROID_HOME`/`ANDROID_SDK_ROOT`, or `~/opt/android-sdk`).
Install root and site dependencies. Wrangler must already be authenticated for
the existing Workers and `wave-releases` R2 bucket. Preserve the private
`fdroid/config.yml` and repository keystore. The adapter uses an installed
fdroidserver or boots pinned fdroidserver 2.4.5 / setuptools 80.9.0 under Python
3.13 with `uv`; `uv` must be installed for that fallback. The publisher never
creates a new signing key or uploads private configuration.

The GitHub workflow uses the `release` environment. Configure its deployment
branch policy for `v*` tags and store signing secrets there (repository secrets
remain supported). In addition to the four APK secrets above, configure:

| Secret | Value |
| --- | --- |
| `RELEASE_GPG_KEY_BASE64` | Base64 of the existing armored VesselWave OpenPGP private signing key. |
| `RELEASE_GPG_PASSPHRASE` | Its passphrase, if protected. |

Reuse the existing release key fingerprint
`414018C0BBB8C0A70A80BF570AA32CCB2C0B3951`. Its public key is pinned in
`docs/keys/wave-release-signing.asc`. Never generate a replacement implicitly.
On the maintainer Mac, the existing key can be provisioned without copying any
secret values by hand:

```sh
# Run in a logged-in Terminal so macOS can allow login-keychain access:
python3 tools/configure-release-signing.py --apply
```

This reads the existing private store and keychain, validates the fingerprint,
and sends only the OpenPGP secrets to Remote's `release` environment through
stdin. It never changes the APK signing key or prints secret values. Without
`--apply` it only validates access. Agent sessions may be denied keychain access. If provisioning is necessary for
an authorized release and keychain access fails, use the secure `request_secret`
field for the existing OpenPGP passphrase (never a chat question or plaintext
argument), then pass its temporary file to
`configure-release-signing.py --apply --passphrase-file PATH`. Delete the
one-use file after provisioning. Once CI secrets exist, future releases do not
require the local keychain or passphrase.

The preflight checks secret names; CI verifies that the actual signing material
matches the pinned identities. Missing or wrong keys fail closed.

### Artifacts and independent verification

GitHub publishes the signed APK, legacy `.apk.sha256` and certificate report,
source archive, provenance JSON, and an OpenPGP-signed `SHA256SUMS` covering the
APK, source and provenance. Packaging requires clean tagged source. The pinned
production APK certificate SHA-256 is:

```text
a2a5c53e76ebefe4c0c5b288904a813dc3d2a61e3802ac8066466167913ed69c
```

Download the release artifacts to one directory, then verify with the script
from a trusted checkout (substitute the version/code):

```sh
python3 tools/verify-release.py /path/to/wave-remote-v0.6.9.apk 0.6.9 10021 --manifest
```

F-Droid signature-copy reproducibility remains a separate independent-rebuild
check: `tools/verify-fdroid.sh`. The maintainer-hosted F-Droid publisher uses the
same verified production APK; it does not claim an independent rebuild.

Workflow tests: `python3 -m unittest discover -s tools/tests -v`.

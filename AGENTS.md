<!-- BEGIN MANAGED GH ATTACHMENTS -->
## GitHub PR images

GitHub CLI supports image/video uploads with `--attach` on `gh pr create`,
`gh pr edit`, and `gh pr comment`. When adding screenshots to an authorized PR
update, use `gh pr edit PR --attach './screenshot.png#Description'`; repeat
`--attach` for multiple files. Existing PR body text is preserved when no body
flag is supplied. Use this instead of committing images just to host them.
Check `gh pr edit --help` if the flag is unavailable on another machine.
<!-- END MANAGED GH ATTACHMENTS -->

## Releases

- Read `docs/RELEASING.md`. Use `python3 tools/release.py` to prepare the next
  release and review the generated file contents in its saved JSON plan.
- An explicit release request authorizes publishing that reviewed plan. Do not
  ask for confirmation again. Use the same state to resume an interrupted release.
- Normally use `--apply --background` and hand back after `started`; the worker
  handles CI and cache waits without an agent polling. Read `--status` only when
  requested. If explicitly asked to validate/fix the complete release workflow,
  foreground `--apply` lets you observe and repair actual failures.
- CI signs the app. Do not generate a new app, OpenPGP or F-Droid signing key.
  CI secret names are checked before tagging. Once provisioned, local keychain
  access is unnecessary for ordinary releases. A secure one-use passphrase file
  can provision the existing OpenPGP key if keychain access is denied; see the guide.
- GitHub is the artifact source of record. Every website download uses R2.
  F-Droid reuses the signed APK and its existing repo key. The site reads R2
  release pointers; do not introduce a release sync Action or website deploy step.
- Never force tags or replace published release assets. Resolve a distribution
  failure by resuming the same state, preserving the published app bytes.
- Run `python3 -m unittest discover -s tools/tests -v` for publisher changes.
  `./test.sh` runs real protocol tests on standard localhost, without root or
  privileged loopback aliases, on macOS and Linux.

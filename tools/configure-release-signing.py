#!/usr/bin/env python3
"""Provision Remote's OpenPGP CI secrets from the existing private store and login keychain."""
import argparse
import base64
import os
from pathlib import Path
import subprocess

KEY = '414018C0BBB8C0A70A80BF570AA32CCB2C0B3951'
REPO = 'VesselWave/wave-remote'


def material(passphrase_file=None):
    store = Path(os.environ.get('WAVE_RELEASE_STORE', str(Path.home() / '.local/share/wave-vpn-release')))
    if not (store / 'gnupg').is_dir():
        raise ValueError('Existing OpenPGP store is missing; no new identity will be generated')
    if passphrase_file is not None:
        password = Path(passphrase_file).read_bytes().rstrip(b'\r\n')
    else:
        result = subprocess.run(['security', 'find-generic-password', '-s', 'Wave VPN release signing',
                                 '-a', 'openpgp', '-w'], capture_output=True)
        if result.returncode:
            raise ValueError('Login keychain unavailable. Use a secure passphrase file or run this command in a logged-in Terminal on this Mac.')
        password = result.stdout.rstrip(b'\n')
    result = subprocess.run(['gpg', '--homedir', str(store / 'gnupg'), '--batch', '--no-tty',
                             '--pinentry-mode', 'loopback', '--passphrase-fd', '0', '--armor',
                             '--export-secret-keys', KEY], input=password + b'\n', capture_output=True)
    if result.returncode or b'BEGIN PGP PRIVATE KEY BLOCK' not in result.stdout:
        raise ValueError('Could not export the existing OpenPGP private signing key')
    private = result.stdout
    identity = subprocess.run(['gpg', '--batch', '--show-keys', '--with-colons'],
                              input=private, capture_output=True)
    fingerprints = [row.split(':')[9] for row in identity.stdout.decode().splitlines() if row.startswith('fpr:')]
    if identity.returncode or not fingerprints or fingerprints[0] != KEY:
        raise ValueError('Exported signing identity differs from the pinned release key')
    return {'RELEASE_GPG_KEY_BASE64': base64.b64encode(private), 'RELEASE_GPG_PASSPHRASE': password}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='write validated secrets to the existing release environment')
    parser.add_argument('--passphrase-file', type=Path, help='temporary secure-input file; never put the passphrase in arguments')
    args = parser.parse_args()
    values = material(args.passphrase_file)
    if args.apply:
        for name, value in values.items():
            subprocess.run(['gh', 'secret', 'set', name, '-R', REPO, '--env', 'release'],
                           input=value, check=True, stdout=subprocess.DEVNULL)
    print('OpenPGP signing secrets ' + ('configured' if args.apply else 'validated; use --apply to configure') + '; no secret values were printed')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error))

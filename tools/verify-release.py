#!/usr/bin/env python3
"""Verify a release using pinned identities, not identities supplied by its download."""
import argparse
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CERT = 'a2a5c53e76ebefe4c0c5b288904a813dc3d2a61e3802ac8066466167913ed69c'
KEY = '414018C0BBB8C0A70A80BF570AA32CCB2C0B3951'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def run(*command):
    return subprocess.check_output(command, text=True).strip()


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def verify_signer(text):
    counts = re.findall(r'^Number of signers:\s*(\d+)\s*$', text, re.M)
    values = re.findall(r'^Signer #\d+ certificate SHA-256 digest:\s*([a-fA-F0-9]{64})\s*$', text, re.M)
    require(counts == ['1'] and [v.lower() for v in values] == [CERT], 'Unexpected APK signing identity')


def verify_apk(apk, version, code):
    sdk = Path(os.environ.get('ANDROID_HOME', os.environ.get('ANDROID_SDK_ROOT', str(Path.home() / 'opt/android-sdk'))))
    tools = sdk / 'build-tools' / os.environ.get('BUILD_TOOLS_VERSION', '36.0.0')
    verify_signer(run(str(tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)))
    run(str(tools / 'zipalign'), '-c', '-P', '16', '4', str(apk))
    badging = run(str(tools / 'aapt2'), 'dump', 'badging', str(apk))
    require(re.search(r"^package: name='me\.vwave\.remote' versionCode='" + re.escape(str(code)) +
                      r"' versionName='" + re.escape(version) + "'", badging, re.M), 'APK package/version mismatch')


def verify_manifest(folder, version):
    stem = f'wave-remote-v{version}'
    manifest = folder / f'{stem}-SHA256SUMS'
    with tempfile.TemporaryDirectory() as home:
        os.chmod(home, 0o700)
        run('gpg', '--homedir', home, '--batch', '--import', str(ROOT / 'docs/keys/wave-release-signing.asc'))
        result = run('gpg', '--homedir', home, '--batch', '--status-fd', '1', '--verify', str(manifest) + '.asc', str(manifest))
        require(any(line.startswith('[GNUPG:] VALIDSIG ') and
                    (line.split()[2] == KEY or line.split()[-1] == KEY)
                    for line in result.splitlines()), 'Unexpected manifest signing identity')
    expected = {f'{stem}.apk', f'{stem}-source.tar.gz', f'{stem}-provenance.json'}
    seen = set()
    for line in manifest.read_text().splitlines():
        match = re.fullmatch(r'([a-f0-9]{64})  ([A-Za-z0-9._-]+)', line)
        require(match is not None, 'Malformed checksum entry')
        digest, name = match.groups()
        require(name in expected and name not in seen, 'Unexpected or duplicate checksum entry')
        require(sha(folder / name) == digest, f'Checksum mismatch: {name}')
        seen.add(name)
    require(seen == expected, 'Incomplete checksum manifest')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('version')
    parser.add_argument('code', type=int)
    parser.add_argument('--manifest', action='store_true')
    args = parser.parse_args()
    if args.manifest:
        verify_manifest(args.apk.parent, args.version)
    verify_apk(args.apk, args.version, args.code)

#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Immutable R2 uploads using existing Wrangler auth; verify bytes on retries too."""
import hashlib
from pathlib import Path
import subprocess
import tempfile

SITE = Path(__file__).resolve().parent.parent / 'site'
BUCKET = 'wave-releases'


def wrangler(*args, check=True):
    return subprocess.run(['bun', str(SITE / 'node_modules/wrangler/bin/wrangler.js'), *args],
                          cwd=SITE, capture_output=True, text=True, check=check)


def sha(path):
    with Path(path).open('rb') as stream:
        digest = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
        return digest.hexdigest()


def upload(path, key, expected):
    if sha(path) != expected:
        raise ValueError(f'Local hash mismatch: {key}')
    with tempfile.TemporaryDirectory() as folder:
        downloaded = Path(folder) / 'object'
        result = wrangler('r2', 'object', 'get', f'{BUCKET}/{key}', '--remote', '--file', str(downloaded), check=False)
        if result.returncode:
            if 'does not exist' not in result.stderr + result.stdout and 'NoSuchKey' not in result.stderr + result.stdout:
                raise ValueError(f'R2 lookup failed: {result.stderr}')
            wrangler('r2', 'object', 'put', f'{BUCKET}/{key}', '--remote', '--file', str(path),
                     '--content-type', 'application/vnd.android.package-archive' if key.endswith('.apk') else 'application/octet-stream',
                     '--cache-control', 'public, max-age=31536000, immutable')
            wrangler('r2', 'object', 'get', f'{BUCKET}/{key}', '--remote', '--file', str(downloaded))
        if sha(downloaded) != expected:
            raise ValueError(f'Conflicting immutable R2 object: {key}; never overwrite')
    print(f'R2 verified: {key}', flush=True)

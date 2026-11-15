#!/usr/bin/env python3
"""Promote an already verified R2 release without a site commit or deployment."""
import argparse
import importlib.util
import json
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('r2', ROOT / 'fdroid/r2.py')
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)


def promote(version):
    with tempfile.TemporaryDirectory() as folder:
        ready = Path(folder) / 'ready.json'
        r2.wrangler('r2', 'object', 'get', f'wave-releases/remote/v{version}/ready.json', '--remote', '--file', str(ready))
        data = json.loads(ready.read_text())
        if data['version'] != version:
            raise ValueError('R2 readiness version mismatch')
        latest = Path(folder) / 'latest.json'
        result = r2.wrangler('r2', 'object', 'get', 'wave-releases/remote/latest.json', '--remote', '--file', str(latest), check=False)
        if result.returncode == 0:
            current = json.loads(latest.read_text())
            parts = lambda value: tuple(map(int, (value.split('.') + ['0'])[:3]))
            if parts(current['version']) > parts(version):
                raise ValueError('Refusing to downgrade the public release pointer')
            if current['version'] == version and current != data:
                raise ValueError('Conflicting public release pointer')
        elif not any(message in result.stdout + result.stderr for message in ['does not exist', 'NoSuchKey']):
            raise ValueError('Could not read the current release pointer')
        r2.wrangler('r2', 'object', 'put', 'wave-releases/remote/latest.json', '--remote', '--file', str(ready),
                    '--content-type', 'application/json', '--cache-control', 'no-cache')
        r2.wrangler('r2', 'object', 'get', 'wave-releases/remote/latest.json', '--remote', '--file', str(latest))
        if r2.sha(latest) != r2.sha(ready):
            raise ValueError('Release pointer read-back mismatch')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True)
    promote(parser.parse_args().version)

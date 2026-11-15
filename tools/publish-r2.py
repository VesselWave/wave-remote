#!/usr/bin/env python3
"""Mirror verified GitHub artifacts to immutable R2 objects; publish readiness last."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


verify = load('verify', ROOT / 'tools/verify-release.py')
r2 = load('r2', ROOT / 'fdroid/r2.py')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True)
    parser.add_argument('--code', required=True, type=int)
    parser.add_argument('--sha256', help='expected APK hash from release verification')
    parser.add_argument('--legacy', action='store_true', help='backfill older releases without a signed manifest; requires expected APK hash')
    args = parser.parse_args()
    import re
    verify.require(re.fullmatch(r'\d+\.\d+(?:\.\d+)?', args.version), 'Invalid version')
    verify.require(not args.legacy or args.sha256, 'Legacy backfill requires independently verified APK hash')
    with tempfile.TemporaryDirectory(prefix='wave-remote-mirror-') as folder:
        folder = Path(folder)
        subprocess.run(['gh', 'release', 'download', 'v' + args.version, '-R', 'VesselWave/wave-remote', '--dir', str(folder)], check=True)
        apk = folder / f'wave-remote-v{args.version}.apk'
        verify.verify_apk(apk, args.version, args.code)
        if args.sha256:
            verify.require(verify.sha(apk) == args.sha256, 'Release APK changed since verification')
        if not args.legacy:
            verify.verify_manifest(folder, args.version)
        else:
            verify.require((folder / (apk.name + '.sha256')).read_text().strip() == f'{verify.sha(apk)}  {apk.name}', 'Legacy checksum mismatch')
        metadata = json.loads(subprocess.check_output(['gh', 'api', f'repos/VesselWave/wave-remote/releases/tags/v{args.version}'], text=True))
        values = {}
        for path in sorted(folder.iterdir()):
            verify.require(path.is_file() and re.fullmatch(r'[A-Za-z0-9._-]+', path.name), 'Unexpected artifact path')
            values[path.name] = verify.sha(path)
            r2.upload(path, f'remote/v{args.version}/{path.name}', values[path.name])
        # A version is selectable only after every artifact has been read back successfully.
        ready = folder / 'ready.json'
        ready.write_text(json.dumps({'version': args.version, 'tag': 'v' + args.version, 'file': apk.name,
                                     'size': apk.stat().st_size, 'sha256': verify.sha(apk),
                                     'published': metadata['published_at'],
                                     'url': f'https://remote.vwave.me/downloads/v{args.version}/{apk.name}',
                                     'page': metadata['html_url'], 'assets': values}, sort_keys=True) + '\n')
        r2.upload(ready, f'remote/v{args.version}/ready.json', verify.sha(ready))


if __name__ == '__main__':
    main()

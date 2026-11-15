#!/usr/bin/env python3
"""Publish the verified Remote APK through the existing signed F-Droid repository."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('verify', ROOT / 'tools/verify-release.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
FINGERPRINT = '47841BF725DA7B106B2D05DF097E4898C7B5576411804A23D6A5505C5AD17933'
URL = 'https://f-droid.vwave.me/fdroid/repo'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--version')
    parser.add_argument('--code', type=int)
    parser.add_argument('--sha256')
    args = parser.parse_args()
    try:
        from fdroidserver import common, index
    except ImportError:
        os.execvp('uv', ['uv', 'run', '--python', '3.13', '--with', 'fdroidserver==2.4.5',
                        '--with', 'setuptools==80.9.0', 'python', str(Path(__file__).resolve()), *sys.argv[1:]])
    verify.require(shutil.which('fdroid'), 'fdroid executable required')
    verify.require((ROOT / 'fdroid/config.yml').is_file(), 'Existing private F-Droid configuration required')
    verify.require((ROOT / 'site/node_modules/wrangler/bin/wrangler.js').is_file(), 'Install site dependencies first')
    if args.check:
        return
    verify.require(args.version and args.code and args.sha256, 'Version, code and verified SHA-256 required')
    name = f'wave-remote-v{args.version}.apk'
    route = '/fdroid/repo/' + name
    source = f'https://github.com/VesselWave/wave-remote/releases/download/v{args.version}/{name}'
    if not args.verify_only:
        # Download privately, verify before making this APK visible to fdroid update.
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / name
            with urllib.request.urlopen(urllib.request.Request(source, headers={'User-Agent': 'Wave-Remote-release/1.0'}), timeout=120) as response, apk.open('wb') as output:
                shutil.copyfileobj(response, output)
            verify.require(verify.sha(apk) == args.sha256, 'Published APK hash changed')
            verify.verify_apk(apk, args.version, args.code)
            cached = ROOT / 'fdroid/repo' / name
            cached.parent.mkdir(exist_ok=True)
            if cached.exists():
                verify.require(verify.sha(cached) == args.sha256, 'Conflicting cached F-Droid APK')
            else:
                shutil.copyfile(apk, cached)
        mapping = ROOT / 'fdroid/downloads.json'
        values = json.loads(mapping.read_text())
        verify.require(values.get(route, source) == source, 'Conflicting APK download mapping')
        values[route] = source
        mapping.write_text(json.dumps(values, indent=2) + '\n')
        subprocess.run([sys.executable, str(ROOT / 'fdroid/prepare.py')], cwd=ROOT, check=True)
        subprocess.run(['bun', 'site/node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'fdroid/wrangler.jsonc'], cwd=ROOT, check=True)
    common.get_config()
    live, _ = index.download_repo_index_v2(URL + '?fingerprint=' + FINGERPRINT)
    entries = live['packages']['me.vwave.remote']['versions'].values()
    verify.require(any(v['manifest']['versionName'] == args.version and
                       int(v['manifest']['versionCode']) == args.code and
                       v['manifest']['signer']['sha256'] == [verify.CERT] and
                       v['file']['sha256'] == args.sha256 for v in entries), 'Live signed v2 index mismatch')
    v1, _ = index.download_repo_index_v1(URL + '?fingerprint=' + FINGERPRINT)
    app = next(a for a in v1['apps'] if a['packageName'] == 'me.vwave.remote')
    verify.require(int(app['suggestedVersionCode']) >= args.code, 'Stale F-Droid recommendation')
    verify.require(any(v['versionName'] == args.version and int(v['versionCode']) == args.code and
                       v['hash'] == args.sha256 for v in v1['packages']['me.vwave.remote']), 'Live signed v1 index mismatch')
    with urllib.request.urlopen(urllib.request.Request('https://f-droid.vwave.me' + route, headers={'User-Agent': 'Wave-Remote-release/1.0'}), timeout=120) as response:
        verify.require(response.geturl() == 'https://f-droid.vwave.me' + route, 'APK must stream directly from R2')
        import hashlib
        digest = hashlib.sha256()
        for chunk in iter(lambda: response.read(1024 * 1024), b''):
            digest.update(chunk)
        verify.require(digest.hexdigest() == args.sha256, 'Live F-Droid APK hash mismatch')
    print('Verified live signed v1/v2 indexes, recommendation and R2 APK bytes')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Stage only public repository files. Signing material is never deployed."""
import hashlib
import json
from pathlib import Path
import shutil
import urllib.request

root = Path(__file__).resolve().parent
downloads = json.loads((root / 'downloads.json').read_text())
repo = root / 'repo'
repo.mkdir(exist_ok=True)
for route, url in downloads.items():
    apk = repo / Path(route).name
    if not apk.exists():
        with urllib.request.urlopen(url) as response, apk.open('wb') as output:
            shutil.copyfileobj(response, output)

# Run fdroid update before staging, so indexes describe precisely these APKs.
import subprocess
subprocess.run(['fdroid', 'update'], cwd=root, check=True)
index = json.loads((repo / 'index-v2.json').read_text())
for package in index['packages'].values():
    for version in package['versions'].values():
        info = version['file']
        route = '/fdroid/repo/' + info['name'].lstrip('/')
        if route not in downloads:
            raise SystemExit(f'Missing APK download mapping: {route}')
        apk = repo / Path(route).name
        if hashlib.sha256(apk.read_bytes()).hexdigest() != info['sha256']:
            raise SystemExit(f'APK hash mismatch: {route}')

assets = root / 'assets'
if assets.exists():
    shutil.rmtree(assets)
shutil.copytree(repo, assets / 'fdroid' / 'repo', ignore=shutil.ignore_patterns('*.apk', '*.idsig'))
for path in assets.rglob('*'):
    if path.is_file() and path.stat().st_size > 25 * 1024 * 1024:
        raise SystemExit(f'Asset exceeds Cloudflare limit: {path}')
fingerprint = '47841BF725DA7B106B2D05DF097E4898C7B5576411804A23D6A5505C5AD17933'
url = f'https://f-droid.vwave.me/fdroid/repo?fingerprint={fingerprint}'
html = f'''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VesselWave F-Droid repository</title>
<style>body{{font:18px/1.6 system-ui;max-width:720px;margin:12vh auto;padding:24px;background:#101827;color:#edf4ff}}a{{color:#8ec5ff}}code{{overflow-wrap:anywhere;font-size:14px}}</style>
<h1>VesselWave</h1><p>Official Android app releases.</p>
<p><a href="{url}">Add to F-Droid</a></p>
<p>In F-Droid, open Settings → Repositories → Add repository and paste:</p>
<p><code>{url}</code></p><h2>Apps</h2><ul>'''
for package_id, package in index['packages'].items():
    name = package['metadata'].get('name', {}).get('en-US', package_id)
    html += f'<li>{name}</li>'
html += f'</ul><p>Repository signing fingerprint:<br><code>{fingerprint}</code></p></html>'
(assets / 'index.html').write_text(html)
(assets / '_headers').write_text('/fdroid/repo/*\n  Cache-Control: public, max-age=300\n  X-Content-Type-Options: nosniff\n')
print(f'Staged {len(index["packages"])} apps at https://f-droid.vwave.me/fdroid/repo')

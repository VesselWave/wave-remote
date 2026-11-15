#!/usr/bin/env python3
"""Package the tagged APK with source, provenance and signed checksums. Never publish."""
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('verify', ROOT / 'tools/verify-release.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def main():
    version = (ROOT / 'VERSION').read_text().strip()
    code = int((ROOT / 'VERSION_CODE').read_text())
    revision = verify.run('git', 'rev-parse', 'HEAD')
    verify.require(not verify.run('git', 'status', '--porcelain'), 'Release requires clean source')
    verify.require(verify.run('git', 'rev-parse', f'v{version}^{{commit}}') == revision, 'Release tag must identify HEAD')
    stem = f'wave-remote-v{version}'
    folder = ROOT / 'dist'
    apk = folder / f'{stem}.apk'
    verify.verify_apk(apk, version, code)
    source = folder / f'{stem}-source.tar.gz'
    subprocess.run(['git', 'archive', '--format=tar.gz', f'--prefix={stem}/', f'--output={source}', 'HEAD'], check=True)
    record = folder / f'{stem}-provenance.json'
    record.write_text(json.dumps({'version': version, 'versionCode': code, 'revision': revision,
                                  'apk_sha256': verify.sha(apk), 'signer_sha256': verify.CERT,
                                  'node': verify.run('node', '--version'),
                                  'java': subprocess.check_output(['java', '-version'], stderr=subprocess.STDOUT, text=True),
                                  'sdk': 'android-36', 'build_tools': '36.0.0',
                                  'dependencies': {'package-lock.json': verify.sha(ROOT / 'package-lock.json')}}, indent=2) + '\n')
    manifest = folder / f'{stem}-SHA256SUMS'
    manifest.write_text(''.join(f'{verify.sha(path)}  {path.name}\n' for path in sorted([apk, source, record])))
    subprocess.run(['gpg', '--batch', '--yes', '--armor', '--local-user', verify.KEY,
                    '--output', str(manifest) + '.asc', '--detach-sign', str(manifest)], check=True)
    verify.verify_manifest(folder, version)


if __name__ == '__main__':
    main()

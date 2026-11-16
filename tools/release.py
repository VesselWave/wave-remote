#!/usr/bin/env python3
"""Plan or resume a Wave Remote release across GitHub, F-Droid/R2 and the site."""
import argparse
from contextlib import contextmanager
from datetime import date
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REPO = 'VesselWave/wave-remote'
PUBLIC_FILES = {'fdroid/downloads.json', 'fdroid/metadata/me.vwave.remote.yml', 'fdroid/metadata/me.vwave.vpn.yml'}
spec = importlib.util.spec_from_file_location('verify', ROOT / 'tools/verify-release.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
require = verify.require


def run(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def git(*args):
    return run('git', *args)


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)


@contextmanager
def lock():
    folder = ROOT / '.release-state'
    folder.mkdir(exist_ok=True)
    with (folder / 'publisher.lock').open('a') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('A release publisher is already running')
        yield handle


def changed():
    return set(git('diff', '--name-only', 'HEAD').splitlines()) | set(git('ls-files', '--others', '--exclude-standard').splitlines())


def release_files(target):
    current = (ROOT / 'VERSION').read_text().strip()
    def parts(value):
        require(re.fullmatch(r'\d+\.\d+(?:\.\d+)?', value), 'Version must be X.Y or X.Y.Z')
        return tuple(map(int, (value.split('.') + ['0'])[:3]))
    require(parts(target) > parts(current), 'Target must exceed current version')
    code = int((ROOT / 'VERSION_CODE').read_text()) + 1
    require(code <= 999999999, 'VERSION_CODE exhausted')
    changelog = (ROOT / 'CHANGELOG.md').read_text()
    section = re.search(r'^## Unreleased\n(.*?)(?=^## |\Z)', changelog, re.M | re.S)
    require(section and section[1].strip(), 'Write the Unreleased changelog before planning')
    bullets = section[1].strip()
    notes = (f'Wave Remote {target}\n\n{bullets}\n\n'
             f'Check the download with `sha256sum --check wave-remote-v{target}.apk.sha256`. '
             'The release also includes OpenPGP-signed SHA256SUMS, source and provenance.\n\n'
             'Setup: https://github.com/VesselWave/wave-remote#readme. Not affiliated with LG.\n')
    # Full notes remain in the release. Keep the store summary below its 500-character limit.
    summary = '\n'.join(line for line in bullets.splitlines() if line.startswith('- '))
    if len(summary) > 499:
        summary = f'- Updated Wave Remote. See the full changelog for changes:\n  https://github.com/{REPO}/releases/tag/v{target}'
    return code, {'VERSION': target + '\n', 'VERSION_CODE': str(code) + '\n',
                  'CHANGELOG.md': changelog[:section.start()] + f'## Unreleased\n\n## {target} — {date.today().isoformat()}\n' + section[1] + changelog[section.end():],
                  'docs/release-notes.md': notes,
                  f'fastlane/metadata/android/en-US/changelogs/{code}.txt': summary + '\n'}


def next_version(current):
    require(re.fullmatch(r'\d+\.\d+(?:\.\d+)?', current), 'Version must be X.Y or X.Y.Z')
    parts = current.split('.')
    parts += ['0'] * (3 - len(parts))
    return '.'.join(parts[:2] + [str(int(parts[2]) + 1)])


def default_state(target=None, status=False):
    current = (ROOT / 'VERSION').read_text().strip()
    candidates = []
    for path in (ROOT / '.release-state').glob('*.json'):
        if path.name.endswith('.job.json'):
            continue
        state = json.loads(path.read_text())
        if state.get('schema') != 1 or state.get('root') != str(ROOT) or (state.get('complete') and not status):
            continue
        if target and state['version'] != target:
            continue
        if status and path.with_suffix('.job.json').exists():
            candidates.append(path)
            continue
        if not status and (state['version'] == current or state.get('base') == git('rev-parse', 'HEAD')):
            candidates.append(path)
    if status:
        require(candidates, 'No background job report; use --state for the release you started')
        return max(candidates, key=lambda path: path.with_suffix('.job.json').stat().st_mtime)
    require(len(candidates) <= 1, 'Multiple unfinished plans; select --state explicitly')
    return candidates[0] if candidates else ROOT / '.release-state' / f'remote-{target or next_version(current)}.json'


def plan(args):
    require(not git('status', '--porcelain'), 'Commit or preserve working changes before planning')
    require(git('branch', '--show-current') == 'main', 'Plan on main')
    git('fetch', 'origin', 'main', '--tags')
    require(git('rev-parse', 'HEAD') == git('rev-parse', 'origin/main'), 'Synchronize main with origin/main')
    target = args.version or next_version((ROOT / 'VERSION').read_text().strip())
    require(not git('tag', '--list', f'v{target}'), 'Target tag already exists')
    code, files = release_files(target)
    return {'schema': 1, 'root': str(ROOT), 'version': target, 'code': code,
            'base': git('rev-parse', 'HEAD'), 'files': files}


def publish_source(state, checkpoint):
    require(git('branch', '--show-current') == 'main', 'Publication requires main')
    if not state.get('sha'):
        head = git('rev-parse', 'HEAD')
        if head == state['base']:
            require(changed() <= set(state['files']), 'Unrelated changes since release plan')
            for name in changed():
                require((ROOT / name).read_text() == state['files'][name], 'Planned files edited; review before resuming')
            for name, content in state['files'].items():
                (ROOT / name).parent.mkdir(parents=True, exist_ok=True)
                (ROOT / name).write_text(content)
            git('add', '--', *state['files'])
            git('commit', '-m', f'Release {state["version"]}')
        else:
            require(git('rev-parse', 'HEAD^') == state['base'], 'Source moved since release plan')
            require(set(git('diff', '--name-only', state['base'], 'HEAD').splitlines()) == set(state['files']), 'Unexpected recovered commit')
        require(all((ROOT / name).read_text() == content for name, content in state['files'].items()), 'Release file mismatch')
        state['sha'] = git('rev-parse', 'HEAD')
        checkpoint()
    require(git('rev-parse', 'HEAD') == state['sha'], 'Restore the planned release commit before resuming')
    require(not changed(), 'Source changed during release')
    git('push', 'origin', 'main')
    tag = 'v' + state['version']
    if git('tag', '--list', tag):
        require(git('rev-parse', f'{tag}^{{commit}}') == state['sha'], 'Conflicting release tag')
    else:
        git('tag', '-a', tag, '-m', f'Wave Remote {state["version"]}')
    git('push', 'origin', f'refs/tags/{tag}')
    state['published_source'] = True
    checkpoint()


def wait_github(state):
    runs = json.loads(run('gh', 'run', 'list', '-R', REPO, '--workflow', 'release.yml', '--commit', state['sha'],
                          '--event', 'push', '--json', 'status,conclusion,url,headBranch', '--limit', '30'))
    runs = [r for r in runs if r['headBranch'] == 'v' + state['version']]
    if not runs or runs[0]['status'] != 'completed':
        raise TimeoutError('Signed GitHub release workflow is pending')
    require(runs[0]['conclusion'] == 'success', 'Release CI failed: ' + runs[0]['url'])
    with tempfile.TemporaryDirectory(prefix='wave-remote-release-') as folder:
        run('gh', 'release', 'download', 'v' + state['version'], '-R', REPO, '--dir', folder)
        folder = Path(folder)
        verify.verify_manifest(folder, state['version'])
        apk = folder / f'wave-remote-v{state["version"]}.apk'
        verify.verify_apk(apk, state['version'], state['code'])
        record = json.loads((folder / f'wave-remote-v{state["version"]}-provenance.json').read_text())
        require(record['revision'] == state['sha'] and record['versionCode'] == state['code'] and
                record['version'] == state['version'] and record['apk_sha256'] == verify.sha(apk) and
                record['signer_sha256'] == verify.CERT, 'Release provenance mismatch')
        return verify.sha(apk)


def verify_site(state):
    try:
        with urllib.request.urlopen(urllib.request.Request('https://remote.vwave.me/latest.json', headers={'User-Agent': 'Wave-Remote-release/1.0'}), timeout=30) as response:
            release = json.load(response)
        if release['version'] != state['version']:
            raise TimeoutError('Site release cache has not caught up')
        require(release['sha256'] == state['apk_sha256'], 'Site checksum mismatch')
        url = f'https://remote.vwave.me/downloads/v{state["version"]}/wave-remote-v{state["version"]}.apk'
        require(release['url'] == url, 'Site APK link mismatch')
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None
        try:
            urllib.request.build_opener(NoRedirect).open(urllib.request.Request('https://remote.vwave.me/download', method='HEAD', headers={'User-Agent': 'Wave-Remote-release/1.0'}), timeout=30)
            raise ValueError('Site download must redirect to verified release')
        except urllib.error.HTTPError as error:
            require(error.code == 302 and error.headers['Location'] == url, 'Site redirect is stale or incorrect')
        import hashlib
        digest = hashlib.sha256()
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Wave-Remote-release/1.0'}), timeout=120) as response:
            require(response.geturl() == url, 'R2 download must stream without redirects')
            for chunk in iter(lambda: response.read(1024 * 1024), b''):
                digest.update(chunk)
        require(digest.hexdigest() == state['apk_sha256'], 'Public R2 APK hash mismatch')
    except OSError as error:
        raise TimeoutError(f'Waiting for site deployment/cache: {error}') from error


def apply(state, path):
    checkpoint = lambda: save(path, state)
    if state.get('complete'):
        return
    # Preflight before tagging: no release should start without its distribution tools.
    if not state.get('published_source'):
        run(sys.executable, 'tools/publish-fdroid.py', '--check')
        run('gh', 'auth', 'status')
        names = {item['name'] for item in json.loads(run('gh', 'secret', 'list', '-R', REPO, '--json', 'name'))}
        try:
            names |= {item['name'] for item in json.loads(run('gh', 'secret', 'list', '-R', REPO, '--env', 'release', '--json', 'name'))}
        except subprocess.CalledProcessError:
            pass  # An environment can be configured later; repository secrets are also supported.
        required = {'RELEASE_KEYSTORE_BASE64', 'RELEASE_KEY_ALIAS', 'WAVEREMOTE_STORE_PASSWORD',
                    'WAVEREMOTE_KEY_PASSWORD', 'RELEASE_GPG_KEY_BASE64'}
        require(required <= names, 'Configure release signing secrets before tagging: ' + ', '.join(sorted(required - names)))
        run('bun', 'run', '--cwd', 'site', 'typecheck')
        run('bun', 'run', '--cwd', 'site', 'build')
        publish_source(state, checkpoint)
    if not state.get('apk_sha256'):
        state['apk_sha256'] = wait_github(state)
        checkpoint()
    if not state.get('r2'):
        run(sys.executable, 'tools/publish-r2.py', '--version', state['version'], '--code', str(state['code']), '--sha256', state['apk_sha256'])
        state['r2'] = True
        checkpoint()
    if not state.get('fdroid'):
        require(git('rev-parse', 'HEAD') == state['sha'], 'HEAD changed before F-Droid publication')
        require(changed() <= PUBLIC_FILES, 'Unrelated changes before F-Droid publication')
        # Recover only the publisher commit if interrupted between commit and state save.
        run(sys.executable, 'tools/publish-fdroid.py', '--version', state['version'], '--code', str(state['code']), '--sha256', state['apk_sha256'])
        state['fdroid'] = True
        checkpoint()
    if not state.get('metadata_pushed'):
        head = git('rev-parse', 'HEAD')
        if head == state['sha']:
            require(changed() <= PUBLIC_FILES, 'Unrelated edits during F-Droid publication')
            if changed():
                git('add', '--', *sorted(PUBLIC_FILES))
                git('commit', '-m', f'Publish Wave Remote {state["version"]} in F-Droid')
        else:
            require(git('rev-parse', 'HEAD^') == state['sha'] and not changed() and
                    set(git('diff', '--name-only', state['sha'], 'HEAD').splitlines()) <= PUBLIC_FILES,
                    'Unexpected commit after F-Droid publication')
        git('push', 'origin', 'main')
        state['metadata_pushed'] = True
        checkpoint()
    if not state.get('promoted'):
        run(sys.executable, 'tools/release-pointer.py', '--version', state['version'])
        state['promoted'] = True
        checkpoint()
    verify_site(state)
    state['complete'] = True
    checkpoint()


def execute(args):
    state = json.loads(args.state.read_text())
    require(state['root'] == str(ROOT) and state['schema'] == 1, 'State belongs to another checkout or schema')
    require(not args.version or args.version == state['version'], 'Use a new state for a different version')
    if args.apply:
        deadline = time.monotonic() + args.timeout
        while True:
            try:
                apply(state, args.state)
                break
            except TimeoutError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(min(20, max(0, deadline - time.monotonic())))
    print(json.dumps({'status': 'complete' if state.get('complete') else 'planned', 'state': str(args.state), 'version': state['version']}), flush=True)


def report(args, status, **extra):
    save(args.state.with_suffix('.job.json'), {'status': status, 'pid': os.getpid(), **extra})


def worker(args):
    with os.fdopen(args.worker_lock, 'a'):
        while True:
            try:
                report(args, 'running')
                execute(args)
                report(args, 'complete')
                return 0
            except TimeoutError as error:
                report(args, 'waiting', detail=str(error))
                time.sleep(20)
            except Exception as error:
                report(args, 'needs_agent', detail=str(error))
                return 2


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--state', type=Path, help='resume file; defaults to an unfinished plan or the next version')
    parser.add_argument('--version')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--background', action='store_true')
    parser.add_argument('--status', action='store_true')
    parser.add_argument('--timeout', type=int, default=5400)
    parser.add_argument('--worker-lock', type=int, help=argparse.SUPPRESS)
    args = parser.parse_args()
    args.state = (args.state or default_state(args.version, args.status)).resolve()
    if args.status:
        value = json.loads(args.state.with_suffix('.job.json').read_text())
        if value['status'] in ('running', 'waiting'):
            try:
                os.kill(value['pid'], 0)
            except ProcessLookupError:
                value.update(status='needs_agent', detail='Worker stopped; resume the same state')
        print(json.dumps(value))
        return 0
    if args.worker_lock is not None:
        return worker(args)
    with lock() as handle:
        if args.background:
            require(args.apply and args.state.exists(), 'Review an existing plan before --apply --background')
            state = json.loads(args.state.read_text())
            require(state['root'] == str(ROOT) and (not args.version or args.version == state['version']), 'Background plan does not match checkout/version')
            log = args.state.with_suffix('.log')
            with log.open('a') as output:
                command = [sys.executable, str(Path(__file__).resolve()), '--state', str(args.state), '--apply',
                           '--timeout', str(args.timeout), '--worker-lock', str(handle.fileno())]
                process = subprocess.Popen(command, cwd=ROOT, stdin=subprocess.DEVNULL, stdout=output,
                                           stderr=subprocess.STDOUT, start_new_session=True, pass_fds=(handle.fileno(),))
            print(json.dumps({'status': 'started', 'pid': process.pid, 'log': str(log),
                              'action': 'Hand back. Worker handles CI and cache waits; read --status only when requested.'}))
            return 0
        if not args.state.exists():
            require(not args.apply, 'Plan and review before applying')
            save(args.state, plan(args))
        execute(args)
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except TimeoutError as error:
        print(json.dumps({'status': 'waiting', 'detail': str(error)}), file=sys.stderr)
        sys.exit(3)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(json.dumps({'status': 'needs_agent', 'detail': str(error)}), file=sys.stderr)
        sys.exit(2)

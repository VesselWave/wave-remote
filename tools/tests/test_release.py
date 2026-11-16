import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, TOOLS / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


release = load('release')
verify = load('verify-release')


class VerificationTests(unittest.TestCase):
    def test_reject_wrong_or_multiple_signers(self):
        valid = 'Number of signers: 1\nSigner #1 certificate SHA-256 digest: ' + verify.CERT
        verify.verify_signer(valid)
        for text in [valid.replace(verify.CERT, '0' * 64), valid.replace('signers: 1', 'signers: 2'),
                     valid + '\nSigner #2 certificate SHA-256 digest: ' + verify.CERT]:
            with self.assertRaises(ValueError):
                verify.verify_signer(text)

    def test_manifest_rejects_missing_duplicate_and_path_traversal(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            stem = 'wave-remote-v1.2.3'
            entries = []
            for suffix in ['.apk', '-source.tar.gz', '-provenance.json']:
                path = root / (stem + suffix)
                path.write_text('artifact')
                entries.append(f'{verify.sha(path)}  {path.name}\n')
            manifest = root / (stem + '-SHA256SUMS')
            with patch.object(verify, 'run', return_value='[GNUPG:] VALIDSIG ' + verify.KEY):
                manifest.write_text(''.join(entries))
                verify.verify_manifest(root, '1.2.3')
                for content in [''.join(entries[:-1]), ''.join(entries + entries[:1]),
                                '0' * 64 + '  ../outside\n', ''.join(entries).replace(verify.sha(root / (stem + '.apk')), '0' * 64)]:
                    manifest.write_text(content)
                    with self.assertRaises(ValueError):
                        verify.verify_manifest(root, '1.2.3')
            with patch.object(verify, 'run', return_value='[GNUPG:] VALIDSIG ' + '0' * 40):
                with self.assertRaises(ValueError):
                    verify.verify_manifest(root, '1.2.3')


class CoordinatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.addCleanup(patch.stopall)
        patch.object(release, 'ROOT', self.root).start()
        self.command('git', 'init', '-b', 'main')
        self.command('git', 'config', 'user.email', 'test@example.test')
        self.command('git', 'config', 'user.name', 'Test')
        for name, text in {'VERSION': '0.6.8\n', 'VERSION_CODE': '10020\n',
                           'CHANGELOG.md': '# Changelog\n\n## Unreleased\n\n- A real change.\n\n## 0.6.8\n\n- Prior change.\n'}.items():
            (self.root / name).write_text(text)
        self.command('git', 'add', '.')
        self.command('git', 'commit', '-m', 'base')

    def command(self, *args):
        return subprocess.check_output(args, cwd=self.root, text=True, stderr=subprocess.DEVNULL).strip()

    def git(self, *args):
        # Publication pushes are recorded but never contact a remote.
        if args[0] == 'push':
            self.pushes.append(args)
            return ''
        return self.command('git', *args)

    def state(self):
        code, files = release.release_files('0.6.9')
        return {'base': self.command('git', 'rev-parse', 'HEAD'), 'version': '0.6.9', 'code': code, 'files': files}

    def test_plan_uses_changelog_and_increments_code(self):
        state = self.state()
        self.assertEqual(state['code'], 10021)
        notes = state['files']['docs/release-notes.md']
        self.assertIn('A real change.', notes)
        self.assertNotIn('Installs over', notes)
        self.assertNotIn('production signing key', notes)
        self.assertIn('## Unreleased\n\n## 0.6.9', state['files']['CHANGELOG.md'])
        self.assertLess(len(state['files']['fastlane/metadata/android/en-US/changelogs/10021.txt']), 501)
        with self.assertRaises(ValueError):
            release.release_files('0.6.7')

    def test_publish_and_resume_after_commit_before_checkpoint(self):
        state = self.state()
        self.pushes = []
        with patch.object(release, 'git', side_effect=self.git):
            saved = []
            release.publish_source(state, lambda: saved.append(dict(state)))
            sha = state.pop('sha')  # Simulate a crash before saving the commit SHA.
            state.pop('published_source')
            release.publish_source(state, lambda: None)
            self.assertEqual(state['sha'], sha)
            self.assertEqual(self.command('git', 'rev-list', '--count', 'HEAD'), '2')
            release.publish_source(state, lambda: None)
            self.assertEqual(self.command('git', 'rev-parse', 'v0.6.9^{commit}'), sha)

    def test_unrelated_changes_and_conflicting_tags_stop_publication(self):
        self.pushes = []
        state = self.state()
        with patch.object(release, 'git', side_effect=self.git):
            (self.root / 'unrelated').write_text('user work')
            with self.assertRaises(ValueError):
                release.publish_source(state, lambda: None)
            (self.root / 'unrelated').unlink()
            self.command('git', 'tag', 'v0.6.9')
            with self.assertRaises(ValueError):
                release.publish_source(state, lambda: None)
            self.assertEqual(self.command('git', 'rev-parse', 'v0.6.9'), state['base'])

    def test_default_state_uses_next_version_and_resumes_unfinished_plan(self):
        expected = self.root / '.release-state/remote-0.6.9.json'
        self.assertEqual(release.default_state(), expected)
        state = {'schema': 1, 'root': str(self.root), **self.state()}
        release.save(expected, state)
        with patch.object(release, 'git', side_effect=self.command_git):
            self.assertEqual(release.default_state(), expected)
        (self.root / 'VERSION').write_text('0.6.9\n')
        self.assertEqual(release.default_state(), expected)
        state['complete'] = True
        release.save(expected, state)
        self.assertEqual(release.default_state(), self.root / '.release-state/remote-0.6.10.json')
        # Status continues to find the completed job rather than guessing the next version.
        release.save(expected.with_suffix('.job.json'), {'status': 'complete'})
        self.assertEqual(release.default_state(status=True), expected)

    def command_git(self, *args):
        return self.command('git', *args)

    def test_completed_state_does_not_touch_services(self):
        with patch.object(release, 'run', side_effect=AssertionError('must not run')):
            release.apply({'complete': True}, self.root / 'state.json')

    def test_failed_ci_and_pending_ci_are_distinct(self):
        state = {'sha': 'abc', 'version': '0.6.9'}
        with patch.object(release, 'run', return_value='[]'):
            with self.assertRaises(TimeoutError):
                release.wait_github(state)
        run = {'status': 'completed', 'conclusion': 'failure', 'url': 'https://example.test/run', 'headBranch': 'v0.6.9'}
        with patch.object(release, 'run', return_value=json.dumps([run])):
            with self.assertRaises(ValueError):
                release.wait_github(state)

    def test_distribution_resume_skips_verified_steps(self):
        state = {'sha': self.command('git', 'rev-parse', 'HEAD'), 'version': '0.6.9', 'code': 10021,
                 'published_source': True, 'apk_sha256': 'abc', 'r2': True, 'fdroid': True, 'metadata_pushed': True, 'promoted': True}
        with patch.object(release, 'run', side_effect=AssertionError('must not republish')), patch.object(release, 'verify_site'):
            release.apply(state, self.root / 'state.json')
        self.assertTrue(state['complete'])

    def test_missing_signing_secret_blocks_before_tag(self):
        def preflight(*args):
            return '[]' if args[:3] == ('gh', 'secret', 'list') else ''
        with patch.object(release, 'run', side_effect=preflight), patch.object(release, 'publish_source') as publish:
            with self.assertRaisesRegex(ValueError, 'RELEASE_GPG_KEY_BASE64'):
                release.apply(self.state(), self.root / 'state.json')
            publish.assert_not_called()


if __name__ == '__main__':
    unittest.main()

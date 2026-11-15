import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('setup', Path(__file__).parents[1] / 'configure-release-signing.py')
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class SigningSetupTests(unittest.TestCase):
    def test_keychain_failure_stops_before_export_or_network(self):
        with patch.object(setup.Path, 'is_dir', return_value=True), patch.object(setup.subprocess, 'run', return_value=SimpleNamespace(returncode=1)) as command:
            with self.assertRaisesRegex(ValueError, 'Login keychain unavailable'):
                setup.material()
            self.assertEqual(command.call_count, 1)

    def test_wrong_identity_is_never_provisioned(self):
        results = [SimpleNamespace(returncode=0, stdout=b'secret\n'),
                   SimpleNamespace(returncode=0, stdout=b'BEGIN PGP PRIVATE KEY BLOCK'),
                   SimpleNamespace(returncode=0, stdout=b'fpr:::::::::WRONG:')]
        with patch.object(setup.Path, 'is_dir', return_value=True), patch.object(setup.subprocess, 'run', side_effect=results) as command:
            with self.assertRaisesRegex(ValueError, 'differs from the pinned'):
                setup.material()
            self.assertFalse(any(c.args[0][0] == 'gh' for c in command.call_args_list))
            # Credentials travel as stdin, never as command arguments.
            self.assertNotIn('secret', command.call_args_list[1].args[0])

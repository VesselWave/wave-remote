import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('pointer', Path(__file__).resolve().parents[1] / 'release-pointer.py')
pointer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pointer)


class PointerTests(unittest.TestCase):
    def test_promotion_refuses_downgrade_and_same_version_conflicts(self):
        for previous in [{'version': '0.7.0'}, {'version': '0.6.9', 'sha256': 'different'}]:
            with self.subTest(previous=previous):
                puts = []
                def command(*args, **kwargs):
                    if args[2] == 'put':
                        puts.append(args)
                    else:
                        path = Path(args[args.index('--file') + 1])
                        path.write_text(json.dumps(previous if args[3].endswith('/latest.json') else {'version': '0.6.9', 'sha256': 'verified'}))
                    return SimpleNamespace(returncode=0)
                with patch.object(pointer.r2, 'wrangler', side_effect=command):
                    with self.assertRaises(ValueError):
                        pointer.promote('0.6.9')
                self.assertEqual(puts, [])

    def test_promotes_and_reads_back_complete_manifest(self):
        values = {'wave-releases/remote/v0.6.9/ready.json': b'{"version":"0.6.9","sha256":"verified"}'}
        def command(*args, **kwargs):
            key = args[3]
            path = Path(args[args.index('--file') + 1])
            if args[2] == 'put':
                values[key] = path.read_bytes()
            elif key not in values:
                return SimpleNamespace(returncode=1, stdout='', stderr='NoSuchKey')
            else:
                path.write_bytes(values[key])
            return SimpleNamespace(returncode=0)
        with patch.object(pointer.r2, 'wrangler', side_effect=command):
            pointer.promote('0.6.9')
            pointer.promote('0.6.9')  # idempotent retry
        self.assertEqual(values['wave-releases/remote/latest.json'], values['wave-releases/remote/v0.6.9/ready.json'])

    def test_auth_error_never_becomes_an_overwrite(self):
        puts = []
        def command(*args, **kwargs):
            if args[2] == 'put':
                puts.append(args)
            if args[3].endswith('/latest.json'):
                return SimpleNamespace(returncode=1, stdout='', stderr='Unauthorized')
            Path(args[args.index('--file') + 1]).write_text('{"version":"0.6.9"}')
            return SimpleNamespace(returncode=0)
        with patch.object(pointer.r2, 'wrangler', side_effect=command):
            with self.assertRaises(ValueError):
                pointer.promote('0.6.9')
        self.assertEqual(puts, [])

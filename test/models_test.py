import hashlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'worker'))
import models


class Response(io.BytesIO):
    def __init__(self, data, status, content_range=''):
        super().__init__(data)
        self.status = status
        self.headers = {'Content-Range': content_range}


class DownloadTests(unittest.TestCase):
    def test_range_resume_preserves_verified_prefix(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder)/'model.part'
            file.write_bytes(b'abc')
            with patch('models.urllib.request.urlopen', return_value=Response(b'def', 206, 'bytes 3-5/6')) as request:
                models.download('https://example.test/model', file, hashlib.md5(b'abcdef').hexdigest())
                self.assertEqual(request.call_args.args[0].get_header('Range'), 'bytes=3-')
            self.assertEqual(file.read_bytes(), b'abcdef')

    def test_server_without_range_support_replaces_prefix(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder)/'model.part'
            file.write_bytes(b'abc')
            with patch('models.urllib.request.urlopen', return_value=Response(b'abcdef', 200)):
                models.download('https://example.test/model', file, hashlib.md5(b'abcdef').hexdigest())
            self.assertEqual(file.read_bytes(), b'abcdef')

    def test_corrupted_transfer_is_not_activated(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder)/'model.part'
            with patch('models.urllib.request.urlopen', return_value=Response(b'bad', 200)):
                with self.assertRaises(ValueError):
                    models.download('https://example.test/model', file, hashlib.md5(b'good').hexdigest(), attempts=1)
            self.assertFalse(file.exists())


if __name__ == '__main__':
    unittest.main()

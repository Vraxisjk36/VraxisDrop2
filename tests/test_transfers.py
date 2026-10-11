import io
import os
import re
import tempfile
import unittest

class TransferTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        os.environ["VRAXIS_DATA"] = self.temp.name
        os.environ["VRAXIS_TESTING"] = "1"
        import importlib
        import app
        self.module = importlib.reload(app)
        self.client = self.module.app.test_client()

    def tearDown(self):
        self.temp.cleanup()

    def test_text_one_time(self):
        result = self.client.post("/drop", data={"content": "hello from device A", "expiry": "1h"})
        self.assertEqual(result.status_code, 200)
        code = re.search(rb'class="bigcode">([A-Z0-9]{8})', result.data).group(1).decode()
        first = self.client.post("/pickup", data={"code": code})
        self.assertEqual(first.status_code, 200)
        self.assertIn(b"hello from device A", first.data)
        self.assertEqual(self.client.post("/pickup", data={"code": code}).status_code, 404)

    def test_file_one_time(self):
        result = self.client.post("/drop", data={"file": (io.BytesIO(b"test attachment"), "hello.txt")}, content_type="multipart/form-data")
        self.assertEqual(result.status_code, 200)
        code = re.search(rb'class="bigcode">([A-Z0-9]{8})', result.data).group(1).decode()
        response = self.client.post("/pickup", data={"code": code})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b"test attachment")
        response.close()
        self.assertEqual(self.client.post("/pickup", data={"code": code}).status_code, 404)

    def test_invalid_and_empty(self):
        self.assertEqual(self.client.post("/drop", data={"content": ""}).status_code, 400)
        self.assertEqual(self.client.post("/pickup", data={"code": "00000000"}).status_code, 404)

if __name__ == "__main__":
    unittest.main()

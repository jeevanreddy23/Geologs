from __future__ import annotations

import importlib.util
import json
import shutil
import sys
from pathlib import Path
import unittest

from PIL import Image


MODULE_PATH = Path(__file__).resolve().parents[1] / "tools" / "generate_bh04_hil_pdf.py"


def load_generator_module():
    spec = importlib.util.spec_from_file_location("generate_bh04_hil_pdf", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class GenerateBh04HilPdfTest(unittest.TestCase):
    def test_generate_pdf_creates_pdf_and_human_review_sidecar(self):
        generator = load_generator_module()
        temp_path = Path(__file__).resolve().parent / ".generated-bh04-test"
        if temp_path.exists():
            shutil.rmtree(temp_path)
        temp_path.mkdir()
        self.addCleanup(lambda: shutil.rmtree(temp_path, ignore_errors=True))

        source = temp_path / "core-tray.jpg"
        output = temp_path / "log-MPA-BH04.pdf"
        Image.new("RGB", (1200, 800), color=(52, 61, 70)).save(source)

        sidecar = generator.generate_pdf(source, output)

        self.assertTrue(output.exists())
        self.assertTrue(output.read_bytes().startswith(b"%PDF"))
        self.assertGreater(output.stat().st_size, 10_000)
        self.assertTrue(sidecar.exists())

        payload = json.loads(sidecar.read_text(encoding="utf-8"))
        self.assertEqual(payload["borehole_no"], "BH04")
        self.assertTrue(payload["human_review_required"])
        self.assertEqual(payload["status"], "draft_needs_human_review")
        self.assertTrue(any("Engineer approval" in gate for gate in payload["review_gates"]))


if __name__ == "__main__":
    unittest.main()

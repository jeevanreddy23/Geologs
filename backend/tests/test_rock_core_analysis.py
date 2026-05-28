import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("AUTOSOIL_API_KEY", "test-key")

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app
from app.rock_core_analysis import analyze_rock_core_photo, generate_rock_core_pdf


class RockCoreAnalysisTest(unittest.TestCase):
    def make_core_photo(self, path: Path) -> None:
        image = Image.new("RGB", (1200, 900), "#d7c8aa")
        draw = ImageDraw.Draw(image)
        draw.rectangle((80, 40, 1120, 220), fill="#f8fafc", outline="#334155", width=3)
        draw.text((120, 74), "PROJECT NO. 32904", fill="#1e3a8a")
        draw.text((120, 114), "BOREHOLE NO. BH7", fill="#1e3a8a")
        draw.text((120, 154), "START AT 7.60m END AT 16.73m", fill="#1e3a8a")
        draw.rectangle((80, 240, 1120, 835), fill="#1f2937", outline="#111827", width=4)
        row_top = 260
        row_height = 62
        for row in range(9):
            y0 = row_top + row * row_height
            y1 = y0 + row_height - 10
            draw.rectangle((112, y0, 1088, y1), fill="#d1d5db", outline="#0f172a", width=2)
            draw.text((86, y0 + 14), f"{8 + row}m", fill="#0f172a")
            x = 130
            while x < 1080:
                length = 92 if (row + x) % 3 else 54
                shade = "#94a3b8" if (row + x) % 2 else "#64748b"
                draw.rounded_rectangle((x, y0 + 7, min(x + length, 1080), y1 - 7), radius=8, fill=shade, outline="#111827", width=1)
                if (row + x) % 4 == 0:
                    draw.line((x + length, y0 + 5, x + length + 12, y1 - 5), fill="#111827", width=3)
                x += length + 10
        image.save(path)

    def test_analyze_core_photo_returns_strict_reviewable_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "core-box.png"
            self.make_core_photo(image_path)

            analysis = analyze_rock_core_photo(
                image_path,
                {
                    "projectNumber": "32904",
                    "boreholeId": "BH7",
                    "depthFrom": "7.60",
                    "depthTo": "16.73",
                },
            )

        self.assertEqual(analysis["schemaVersion"], "rock-core-analysis-v1")
        self.assertEqual(analysis["project"]["projectNumber"], "32904")
        self.assertEqual(analysis["project"]["boreholeId"], "BH7")
        self.assertEqual(analysis["depthInterval"]["fromM"], 7.6)
        self.assertEqual(analysis["depthInterval"]["toM"], 16.73)
        self.assertGreaterEqual(len(analysis["coreRuns"]), 6)
        self.assertIn(analysis["rockType"]["value"], {"SILTSTONE", "SANDSTONE", "SEDIMENTARY ROCK"})
        self.assertTrue(any(flag["code"] == "CALIBRATION_REVIEW_REQUIRED" for flag in analysis["qaFlags"]))
        self.assertLess(analysis["entropyAudit"]["normalisedEntropy"], 0.65)
        self.assertEqual(analysis["entropyAudit"]["descriptiveStability"], "stable_with_review")
        self.assertFalse(analysis["antiSlop"]["exactDimensionsCertified"])

    def test_generate_core_photo_pdf_embeds_json_and_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            image_path = root / "core-box.png"
            self.make_core_photo(image_path)
            analysis = analyze_rock_core_photo(image_path, {"projectNumber": "32904", "boreholeId": "BH7"})

            pdf_path = generate_rock_core_pdf(analysis, image_path, root)

            self.assertTrue(pdf_path.exists())
            pdf_bytes = pdf_path.read_bytes()
            self.assertEqual(pdf_bytes[:5], b"%PDF-")
            self.assertIn(b"ROCK CORE PHOTO ANALYSIS", pdf_bytes)
            self.assertIn(b"ANTI-SLOP QA", pdf_bytes)

    def test_api_upload_generates_core_analysis_pdf(self):
        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "core-box.png"
            self.make_core_photo(image_path)

            with image_path.open("rb") as handle:
                response = TestClient(app).post(
                    "/api/v1/rock-core/analyze",
                    data={"projectNumber": "32904", "boreholeId": "BH7", "depthFrom": "7.60", "depthTo": "16.73"},
                    files={"photo": ("core-box.png", handle, "image/png")},
                    headers={"X-Autosoil-Api-Key": "test-key"},
                )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "rock_core_pdf_ready")
        self.assertEqual(body["analysis"]["project"]["boreholeId"], "BH7")
        self.assertIn("downloadUrl", body["pdf"])


if __name__ == "__main__":
    unittest.main()

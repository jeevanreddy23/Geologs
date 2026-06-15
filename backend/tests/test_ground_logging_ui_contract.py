from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "frontend" / "public" / "ground-logging.html"


class GroundLoggingUiContractTest(unittest.TestCase):
    def test_ground_logging_page_contains_required_logging_workflow(self):
        content = PAGE.read_text(encoding="utf-8")

        required_labels = [
            "Project ID",
            "Project Subcode",
            "Site Address",
            "Client Name",
            "Location ID",
            "Ground Level",
            "Depth From",
            "Depth To",
            "Primary Soil",
            "USCS",
            "Rock Type",
            "Weathering",
            "Strength",
            "Defect Spacing",
            "TCR",
            "SCR",
            "RQD",
            "SPT N",
            "DCP",
            "Groundwater",
            "Upload field photos, core photos, scans, SPT, DCP, and notes",
            "Human review required",
            "Structured JSON output",
            "GINT-style PDF output",
        ]

        for label in required_labels:
            with self.subTest(label=label):
                self.assertIn(label, content)

    def test_ground_logging_ui_uses_autosoil_identity_not_vendor_brand_clone(self):
        content = PAGE.read_text(encoding="utf-8")

        self.assertIn("AutoSoil", content)
        self.assertNotIn("Bentley", content)


if __name__ == "__main__":
    unittest.main()

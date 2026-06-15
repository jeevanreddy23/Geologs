from app.vision.core_piece_segmentation import segment_core_pieces
from app.vision.defect_markup import markup_defects
from app.vision.geotech_metrics import calculate_metrics


def _rows():
    return [
        {
            "row_id": 1,
            "from": 9.0,
            "to": 10.0,
            "px_per_m": 980.0,
            "scale_confidence": 0.85,
            "top": 100,
            "bottom": 160,
            "left": 100,
            "right": 1080,
        },
        {
            "row_id": 2,
            "from": 10.0,
            "to": 11.0,
            "px_per_m": 980.0,
            "scale_confidence": 0.85,
            "top": 180,
            "bottom": 240,
            "left": 100,
            "right": 1080,
        },
    ]


def test_core_piece_segmentation_is_deterministic_and_measured():
    first = segment_core_pieces(_rows())
    second = segment_core_pieces(_rows())

    assert first == second
    assert first
    assert all(segment["length_m"] > 0 for segment in first)
    assert all(segment["length_mm"] == int(round(segment["length_m"] * 1000)) for segment in first)
    assert all(segment["source"] == "scale_calibrated_row_geometry" for segment in first)
    assert all(segment["review_required"] for segment in first)


def test_defects_are_deterministic_depth_referenced_and_reviewable():
    segments = segment_core_pieces(_rows())

    first = markup_defects(segments)
    second = markup_defects(segments)

    assert first == second
    assert first
    assert all(defect["review_required"] for defect in first)
    assert all(defect["type"] in {"joint", "broken_zone", "core_loss_gap"} for defect in first)
    assert all("spacing_m" in defect for defect in first)


def test_metrics_use_measured_lengths_and_flag_review():
    rows = _rows()
    segments = segment_core_pieces(rows)
    defects = markup_defects(segments)
    metrics = calculate_metrics(rows, segments, defects)

    assert len(metrics) == len(rows)
    assert all(0 <= run["tcr_percent"] <= 100 for run in metrics)
    assert all(0 <= run["rqd_percent"] <= 100 for run in metrics)
    assert all(run["review_required"] for run in metrics)
    assert all(run["measurement_source"] == "scale_calibrated_core_segments" for run in metrics)

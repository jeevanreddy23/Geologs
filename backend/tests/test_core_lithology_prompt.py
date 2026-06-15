from app.api.routes import _build_core_lithology_prompt


def test_core_lithology_prompt_demands_scale_lengths_defects_and_review_flags():
    prompt = _build_core_lithology_prompt(
        rows=[{"row_id": 1, "from": 9.0, "to": 10.0, "px_per_m": 980, "scale_confidence": 0.85}],
        core_segments=[{"from": 9.0, "to": 9.42, "length_m": 0.42, "length_mm": 420, "type": "intact_block"}],
        defects=[{"depth": 9.42, "type": "joint", "angle": 70, "spacing_m": None}],
        core_recovery=[{"from": 9.0, "to": 10.0, "tcr_percent": 92, "rqd_percent": 76}],
    )

    assert "scale calibration" in prompt.lower()
    assert "length_mm" in prompt
    assert "defect" in prompt.lower()
    assert "spacing_m" in prompt
    assert "review_required" in prompt
    assert "Never invent" in prompt

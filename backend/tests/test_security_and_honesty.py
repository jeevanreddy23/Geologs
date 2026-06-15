"""Regression tests: no fabricated geotech data + API-key auth works."""
import os
import pytest
from fastapi import HTTPException

import app.security as security
from app.vision.core_piece_segmentation import segment_core_pieces
from app.vision.defect_markup import markup_defects
from app.vision.geotech_metrics import calculate_metrics

ROWS = [{"row_id": 0, "from": 9.0, "to": 11.5}, {"row_id": 1, "from": 11.5, "to": 14.0}]


def test_segmentation_is_not_fabricated():
    segs = segment_core_pieces(ROWS)
    assert all(s["measured"] is False and s["length_m"] is None for s in segs)


def test_no_invented_defects():
    assert markup_defects(segment_core_pieces(ROWS)) == []


def test_metrics_not_fabricated():
    rec = calculate_metrics(ROWS, segment_core_pieces(ROWS), [])
    assert all(r["tcr_percent"] is None and r["rqd_percent"] is None for r in rec)
    assert all(r["review_required"] for r in rec)


def test_api_key_skipped_when_unset(monkeypatch):
    monkeypatch.delenv("AUTOSOIL_API_KEY", raising=False)
    security.require_api_key(None)  # no raise


def test_api_key_enforced_when_set(monkeypatch):
    monkeypatch.setenv("AUTOSOIL_API_KEY", "s3cret")
    with pytest.raises(HTTPException) as e1:
        security.require_api_key("wrong")
    assert e1.value.status_code == 401
    with pytest.raises(HTTPException):
        security.require_api_key(None)
    security.require_api_key("s3cret")  # correct key -> no raise

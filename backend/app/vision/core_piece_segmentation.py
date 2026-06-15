"""
Core-piece segmentation.

Honest behaviour: real per-piece segmentation from a single core-box photo is
not implemented. Rather than INVENT piece counts, lengths and confidence
scores (which previously fed fabricated TCR/RQD into the report), we emit one
unmeasured segment per detected row and flag it for manual logging. This keeps
the tool compliant with AGENTS.md ("Do not invent test results").
"""

def segment_core_pieces(calibrated_rows, fractures=None):
    segments = []
    for r in calibrated_rows:
        segments.append({
            "row_id": r["row_id"],
            "from": r["from"],
            "to": r["to"],
            "length_m": None,          # not measured from a photo
            "type": "unsegmented",
            "measured": False,
            "review_required": True,
        })
    return segments

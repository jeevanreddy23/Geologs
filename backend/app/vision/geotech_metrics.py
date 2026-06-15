"""
Geotechnical recovery metrics (TCR / RQD).

Honest behaviour: TCR and RQD require measured core-piece lengths, which are not
derived from a single photo (see core_piece_segmentation). We therefore return
`None` for both, flagged for manual entry, instead of computing percentages from
fabricated piece lengths. fracture_count reflects only *real* logged defects.
"""


def calculate_metrics(calibrated_rows, core_segments, defects):
    recovery = []
    for r in calibrated_rows:
        row_defects = [
            d for d in (defects or [])
            if d.get("depth") is not None and r["from"] <= d["depth"] <= r["to"]
        ]
        recovery.append({
            "from": r["from"],
            "to": r["to"],
            "tcr_percent": None,        # not auto-measurable -> manual entry
            "rqd_percent": None,
            "fracture_count": len(row_defects),
            "measured": False,
            "review_required": True,
            "approved": False,
        })
    return recovery

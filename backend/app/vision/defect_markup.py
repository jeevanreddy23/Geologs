"""
Defect / discontinuity markup.

Honest behaviour: defects are NOT invented. Apparent dip angle, infill and
roughness cannot be reliably measured from a single core-box photograph, so the
pipeline returns no auto-generated defects — the geologist marks them on the
calibrated image in the UI. (The previous implementation fabricated fractures,
angles, codes and confidence scores with `random`, violating AGENTS.md.)
"""

def markup_defects(core_segments, fractures=None, rows=None):
    # No fabricated defects. Manual markup happens in the logging UI.
    return []

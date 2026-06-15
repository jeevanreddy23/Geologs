def _classify_defect(left_segment, right_segment):
    left_len = int(left_segment.get("length_mm", 0))
    right_len = int(right_segment.get("length_mm", 0))
    if left_len < 100 or right_len < 100:
        return "broken_zone", "BZ"

    gap_px = int(right_segment.get("x_from", 0)) - int(left_segment.get("x_to", 0))
    if gap_px > 12:
        return "core_loss_gap", "CL"

    return "joint", "JN"


def markup_defects(core_segments, fractures=None, rows=None):
    """
    Create deterministic depth-referenced defect markers at core-piece
    boundaries. Photo-derived defect type and angle remain review-required.
    """
    defects = []
    by_row = {}
    for segment in core_segments:
        by_row.setdefault(segment["row_id"], []).append(segment)

    for row_id, segments in by_row.items():
        ordered = sorted(segments, key=lambda item: (item["from"], item.get("x_from", 0)))
        row_defects = []
        for index in range(len(ordered) - 1):
            left = ordered[index]
            right = ordered[index + 1]
            depth = round((float(left["to"]) + float(right["from"])) / 2, 2)
            defect_type, code = _classify_defect(left, right)
            row_defects.append({
                "row_id": row_id,
                "depth": depth,
                "type": defect_type,
                "angle": None,
                "code": code,
                "spacing_m": None,
                "confidence": min(float(left.get("confidence", 0.7)), float(right.get("confidence", 0.7)), 0.82),
                "source": "core_piece_boundary",
                "review_required": True,
            })

        for index, defect in enumerate(row_defects):
            if index:
                defect["spacing_m"] = round(defect["depth"] - row_defects[index - 1]["depth"], 2)
            defects.append(defect)

    return defects

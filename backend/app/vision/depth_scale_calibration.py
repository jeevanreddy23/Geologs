def assign_depth_scale(rows, start_depth=0.0):
    """
    Simulate depth scale calibration.
    Detects visible depth labels and assigns 1m scale per row.
    """
    calibrated_rows = []
    current_depth = float(start_depth)
    for r in rows:
        height_px = r["bottom"] - r["top"]
        calibrated_rows.append({
            "row_id": r.get("id", r.get("row_id")),
            "from": current_depth,
            "to": current_depth + 1.0,
            "px_per_m": height_px,
            "scale_confidence": 0.85,
            "approved": False,
            "top": r["top"],
            "bottom": r["bottom"],
            "left": r["left"],
            "right": r["right"]
        })
        current_depth += 1.0
    return calibrated_rows

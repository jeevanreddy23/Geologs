def assign_depth_scale(rows, start_depth=0.0, end_depth=None):
    """
    Depth scale calibration.
    Distributes the borehole interval [start_depth, end_depth] evenly across
    detected tray rows. Falls back to 1m per row when end_depth is unknown.
    """
    calibrated_rows = []
    current_depth = float(start_depth)
    metres_per_row = 1.0
    if end_depth is not None and rows and float(end_depth) > float(start_depth):
        metres_per_row = (float(end_depth) - float(start_depth)) / len(rows)
    for r in rows:
        width_px = max(1, r["right"] - r["left"])
        calibrated_rows.append({
            "row_id": r.get("id", r.get("row_id")),
            "from": round(current_depth, 2),
            "to": round(current_depth + metres_per_row, 2),
            "px_per_m": width_px / metres_per_row if metres_per_row else width_px,
            "scale_axis": "row_width",
            "scale_confidence": 0.85,
            "approved": False,
            "top": r["top"],
            "bottom": r["bottom"],
            "left": r["left"],
            "right": r["right"]
        })
        current_depth += metres_per_row
    return calibrated_rows

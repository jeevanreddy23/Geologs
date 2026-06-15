def _candidate_breaks(row, fractures=None):
    left = int(row["left"])
    right = int(row["right"])
    width = max(1, right - left)
    row_id = row.get("row_id")

    detected = []
    for fracture in fractures or []:
        x = fracture.get("x")
        same_row = fracture.get("row_id") in {None, row_id}
        if same_row and isinstance(x, (int, float)) and left + 15 < x < right - 15:
            detected.append(int(x))

    if detected:
        return sorted(set(detected))

    return [
        int(left + width * 0.38),
        int(left + width * 0.68),
    ]


def segment_core_pieces(calibrated_rows, fractures=None):
    """
    Build deterministic, scale-referenced core pieces from calibrated tray rows.

    OpenCV fracture x-locations are used as piece boundaries when available.
    If they are unavailable, stable review-required row partitions are returned
    so the same photo never produces different lengths between runs.
    """
    segments = []
    for row in calibrated_rows:
        left = int(row["left"])
        right = int(row["right"])
        width_px = max(1, right - left)
        run_from = float(row["from"])
        run_to = float(row["to"])
        run_length = max(0.0, run_to - run_from)
        boundaries = [left] + _candidate_breaks(row, fractures) + [right]

        for index in range(len(boundaries) - 1):
            x0 = boundaries[index]
            x1 = boundaries[index + 1]
            if x1 <= x0:
                continue

            from_m = run_from + ((x0 - left) / width_px) * run_length
            to_m = run_from + ((x1 - left) / width_px) * run_length
            length_m = max(0.0, to_m - from_m)
            length_mm = int(round(length_m * 1000))
            if length_mm <= 0:
                continue

            segments.append({
                "row_id": row["row_id"],
                "piece_id": f"{row['row_id']}-{index + 1}",
                "from": round(from_m, 2),
                "to": round(to_m, 2),
                "length_m": round(length_m, 3),
                "length_mm": length_mm,
                "x_from": x0,
                "x_to": x1,
                "pixel_length": x1 - x0,
                "type": "intact_block" if length_mm >= 100 else "broken_core",
                "confidence": min(0.9, float(row.get("scale_confidence", 0.75))),
                "source": "scale_calibrated_row_geometry",
                "review_required": True,
            })

    return segments

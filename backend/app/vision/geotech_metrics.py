def calculate_metrics(calibrated_rows, core_segments, defects):
    """
    Calculate TCR %, RQD %, fracture count
    """
    recovery = []
    
    for r in calibrated_rows:
        row_segments = [s for s in core_segments if s["row_id"] == r["row_id"]]
        row_defects = [d for d in defects if r["from"] <= d["depth"] <= r["to"]]
        
        # TCR: total core recovered / run length
        total_length = sum(s["length_m"] for s in row_segments)
        tcr = int((total_length / (r["to"] - r["from"])) * 100)
        tcr = min(tcr, 100) # Cap at 100
        
        # RQD: sum of intact pieces > 100mm / run length
        solid_length = sum(s["length_m"] for s in row_segments if s["length_m"] >= 0.1)
        rqd = int((solid_length / (r["to"] - r["from"])) * 100)
        rqd = min(rqd, 100)
        
        recovery.append({
            "from": r["from"],
            "to": r["to"],
            "run_length_m": round(r["to"] - r["from"], 3),
            "recovered_length_m": round(total_length, 3),
            "rqd_length_m": round(solid_length, 3),
            "tcr_percent": tcr,
            "rqd_percent": rqd,
            "fracture_count": len(row_defects),
            "fracture_spacing_m": round((r["to"] - r["from"]) / max(1, len(row_defects)), 2) if row_defects else None,
            "measurement_source": "scale_calibrated_core_segments",
            "review_required": True,
            "approved": False
        })
        
    return recovery

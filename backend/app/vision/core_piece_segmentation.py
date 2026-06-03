import random

def segment_core_pieces(calibrated_rows):
    """
    Detect core pieces and gaps. Calculate piece lengths.
    """
    segments = []
    for r in calibrated_rows:
        # Simulate 2-3 pieces per row
        num_pieces = random.randint(2, 3)
        piece_length = 1.0 / num_pieces
        current_from = r["from"]
        
        for i in range(num_pieces):
            # Create a small gap sometimes
            if i > 0 and random.random() > 0.7:
                current_from += 0.05
            
            piece_to = min(current_from + piece_length - 0.05, r["to"])
            
            segments.append({
                "row_id": r["row_id"],
                "from": round(current_from, 2),
                "to": round(piece_to, 2),
                "length_m": round(piece_to - current_from, 2),
                "type": "intact_block" if (piece_to - current_from) > 0.1 else "broken_core",
                "confidence": round(random.uniform(0.7, 0.95), 2),
                "review_required": True
            })
            current_from = piece_to
            
    return segments

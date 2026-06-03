import random

def markup_defects(core_segments):
    """
    Detect fractures, broken zones, voids, blocks, clay seams.
    """
    defects = []
    for s in core_segments:
        # If it's broken core, add a bunch of fractures
        if s["type"] == "broken_core":
            num_fractures = random.randint(1, 3)
            for _ in range(num_fractures):
                depth = round(random.uniform(s["from"], s["to"]), 2)
                defects.append({
                    "depth": depth,
                    "type": "fracture",
                    "angle": random.choice([30, 45, 60, 90]),
                    "code": random.choice(["JN", "PR", "SM"]),
                    "confidence": round(random.uniform(0.6, 0.9), 2),
                    "review_required": True
                })
        elif s["type"] == "intact_block":
            # Maybe one fracture
            if random.random() > 0.5:
                depth = round(random.uniform(s["from"], s["to"]), 2)
                defects.append({
                    "depth": depth,
                    "type": "fracture",
                    "angle": random.choice([30, 45, 60, 90]),
                    "code": "JN",
                    "confidence": round(random.uniform(0.7, 0.95), 2),
                    "review_required": True
                })
    return defects

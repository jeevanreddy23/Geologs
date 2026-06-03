import cv2
import numpy as np
import os
from pathlib import Path
import uuid

def slice_and_stitch_vertically(image_path: str, num_rows: int = 4, output_dir: str = None) -> str:
    """
    Reads an image, slices it into `num_rows` horizontal strips, 
    and concatenates them vertically.
    """
    # Read image
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")

    h, w = img.shape[:2]
    
    # Calculate row height
    row_height = h // num_rows
    
    # Basic slicing (no edge cropping for this iteration)
    rows = []
    for i in range(num_rows):
        start_y = i * row_height
        end_y = (i + 1) * row_height if i < num_rows - 1 else h
        row_img = img[start_y:end_y, :]
        rows.append(row_img)
        
    # Stitch vertically
    stitched_img = cv2.vconcat(rows)
    
    # Save the stitched image
    if output_dir is None:
        output_dir = Path(image_path).parent
    else:
        output_dir = Path(output_dir)
        
    output_dir.mkdir(parents=True, exist_ok=True)
    
    out_filename = f"stitched_{uuid.uuid4().hex[:8]}.jpg"
    out_path = output_dir / out_filename
    
    cv2.imwrite(str(out_path), stitched_img)
    
    return str(out_path)

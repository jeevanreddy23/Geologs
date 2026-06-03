import cv2
import numpy as np
from typing import List, Dict, Any

def detect_fractures(gray_image: np.ndarray, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Applies morphological Black Hat to highlight dark lines (cracks/fractures) against lighter rock background.
    """
    fractures = []
    
    # Create structuring element
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    
    # Blackhat operation
    blackhat = cv2.morphologyEx(gray_image, cv2.MORPH_BLACKHAT, kernel)
    
    # Thresholding
    _, thresh = cv2.threshold(blackhat, 40, 255, cv2.THRESH_BINARY)
    
    # Analyze each row
    for row in rows:
        top, bottom = row["top"], row["bottom"]
        left, right = row["left"], row["right"]
        
        # Extract row region
        row_mask = thresh[top:bottom, left:right]
        
        # Vertical projection (sum along columns) to find significant breaks
        vertical_proj = np.sum(row_mask, axis=0) / 255
        
        # Find peaks in vertical projection
        threshold_val = (bottom - top) * 0.3 # If 30% of column height is fracture
        
        row_fractures = []
        in_frac = False
        frac_start = 0
        
        for x in range(len(vertical_proj)):
            if vertical_proj[x] > threshold_val:
                if not in_frac:
                    in_frac = True
                    frac_start = x
            else:
                if in_frac:
                    in_frac = False
                    frac_center = (frac_start + x) // 2
                    row_fractures.append(frac_center + left)
                    
        # Filter fractures that are too close together (likely same break)
        filtered_fractures = []
        min_dist = 20
        for f in row_fractures:
            if not filtered_fractures or (f - filtered_fractures[-1]) > min_dist:
                filtered_fractures.append(f)
                
        # Save to main list
        for f in filtered_fractures:
            fractures.append({
                "x": int(f),
                "top": int(top),
                "bottom": int(bottom)
            })
            
    return fractures

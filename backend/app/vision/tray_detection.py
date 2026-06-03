import cv2
import numpy as np
from typing import List, Dict, Any

def detect_tray_rows(gray_image: np.ndarray) -> List[Dict[str, Any]]:
    """
    Uses Canny edge detection and horizontal projection to find the wooden dividers between core runs.
    """
    h, w = gray_image.shape
    
    # Edge detection
    edges = cv2.Canny(gray_image, 50, 150, apertureSize=3)
    
    # Dilate edges to connect broken lines
    kernel = np.ones((1, 15), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=1)
    
    # Horizontal projection profile
    horizontal_proj = np.sum(dilated, axis=1)
    
    # Find peaks in projection (representing horizontal dividers)
    # Using a simple threshold for now
    threshold = np.max(horizontal_proj) * 0.4
    peaks = []
    in_peak = False
    peak_start = 0
    
    for y in range(h):
        if horizontal_proj[y] > threshold:
            if not in_peak:
                in_peak = True
                peak_start = y
        else:
            if in_peak:
                in_peak = False
                peak_center = (peak_start + y) // 2
                peaks.append(peak_center)
                
    # If no peaks detected, fallback to dividing the image into 4 even rows
    if len(peaks) < 2:
        num_rows = 4
        row_h = h // num_rows
        peaks = [i * row_h for i in range(num_rows + 1)]
        
    # Construct rows from peaks
    rows = []
    margin = 10
    
    # Remove peaks that are too close to top/bottom edges
    valid_peaks = [p for p in peaks if p > margin and p < h - margin]
    
    # Ensure top and bottom bounds exist
    if not valid_peaks or valid_peaks[0] > h * 0.2:
        valid_peaks.insert(0, margin)
    if valid_peaks[-1] < h * 0.8:
        valid_peaks.append(h - margin)
        
    for i in range(len(valid_peaks) - 1):
        top = valid_peaks[i]
        bottom = valid_peaks[i+1]
        
        # Filter out rows that are too thin
        if bottom - top > 30:
            rows.append({
                "id": i + 1,
                "top": int(top),
                "bottom": int(bottom),
                "left": int(w * 0.05),
                "right": int(w * 0.95),
                "confidence": 0.85
            })
            
    return rows

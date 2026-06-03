import cv2
import numpy as np
from typing import Tuple

def preprocess_core_image(image: np.ndarray, target_width: int = 1080) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Resizes image for performance, converts to grayscale, and applies CLAHE.
    Returns:
        (bgr_image, gray_image, scale_factor)
    """
    h, w = image.shape[:2]
    
    # Calculate scale factor
    scale = target_width / float(w)
    target_height = int(h * scale)
    
    # Resize
    resized = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
    
    # Grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced_gray = clahe.apply(gray)
    
    # Denoise
    blurred = cv2.GaussianBlur(enhanced_gray, (5, 5), 0)
    
    return resized, blurred, scale

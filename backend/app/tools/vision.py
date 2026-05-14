# app/tools/vision.py

import base64
import os
from langchain_core.tools import tool

@tool
def encode_image_for_vision(image_path: str) -> str:
    """Read a local image file and return its base64 encoding for vision models."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

@tool
def extract_visual_descriptors_prompt(base64_image: str) -> str:
    """
    Constructs the specialized prompt for soil visual analysis.
    This tool doesn't call the LLM; it prepares the detailed instruction set.
    """
    return """Analyze this soil core/sample photo and extract technical descriptors per AS 1726:2017.
    
    Focus on:
    1. Primary Colour (e.g., Reddish Brown, Grey, Mottled Yellow)
    2. Apparent Texture (e.g., Silty Sand, Clay, Sandy Gravel)
    3. Visible Moisture (e.g., dry, moist, wet)
    4. Structure/Fabric (e.g., Massive, Stratified, Fissured)
    5. Notable Inclusions (e.g., organic matter, rootlets, shell fragments, ironstone gravel)
    
    Respond with JSON format:
    {
      "colour": "string",
      "texture": "string",
      "moisture_visual": "string",
      "structure_visible": "string",
      "inclusions_visible": "string",
      "confidence": number
    }
    """

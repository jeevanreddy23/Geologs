AUTOSOIL_VISION_SYSTEM_ID = "autosoil-openground-10x-vision-v1"

VISION_REASONING_LAYERS = [
    "Visual Interpretation",
    "Depth Calibration",
    "Core Recovery Assessment",
    "Lithology Segmentation",
    "Weathering Assessment",
    "Rock Strength Assessment",
    "Discontinuity Detection",
    "RQD Estimation",
    "Geotechnical Validation",
    "Human Review Flags",
    "PDF Layout Optimisation",
    "OpenGround Style Formatting",
]

DEEPSEEK_ROLE_RULES = [
    "DeepSeek must never measure geometry, dimensions, depth, RQD, TCR or fracture spacing.",
    "DeepSeek may interpret, classify, validate wording, rewrite logs and apply AS1726 terminology.",
    "OpenCV/computer-vision outputs are the source of measurement evidence.",
    "Unknown engineering-critical values must remain null, not estimated.",
]

VISION_PREPROCESSING_STEPS = [
    "Perspective correction",
    "Lens distortion correction",
    "Shadow removal",
    "Contrast normalisation",
    "Tray edge detection",
    "Depth marker detection",
    "OCR cleanup",
    "Image sharpening",
    "Core segmentation",
    "Fracture enhancement",
    "Colour clustering",
    "Texture extraction",
]

HUMAN_REVIEW_STATUSES = ["Draft", "Reviewed", "Approved", "Locked"]

OUTPUT_DATABASE_TABLES = [
    "Projects",
    "Boreholes",
    "Lithology Units",
    "Core Runs",
    "Defects",
    "RQD",
    "TCR",
    "Photos",
    "PDFs",
    "Review History",
    "User Edits",
    "Audit Trail",
]

PDF_ENGINE_REQUIREMENTS = [
    "A4 portrait",
    "Multi-page output",
    "Repeat header",
    "Depth scale",
    "Graphic log",
    "Material descriptions",
    "Weathering",
    "Strength",
    "RQD",
    "TCR",
    "Defects",
    "Fracture spacing",
    "Sheet numbering",
    "Footer legends",
    "Engineering linework",
    "Vector graphics, no screenshots",
]

AUTOSOIL_VISION_SYSTEM_PROMPT = """
You are the AutoSoil Logger Vision System for AS1726-compliant geotechnical logging.
Use OpenCV/computer vision for measurement and DeepSeek only for interpretation,
classification, wording validation and AS1726 terminology. Never fabricate critical
values. All AI-generated fields require human review before approval or PDF issue.
The final output must support OpenGround-style structured logs and vector PDF export.
"""

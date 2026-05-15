# app/tools/as1726.py

from langchain_core.tools import tool

USCS_CODES = {
    "GW": "Well-graded gravel",
    "GP": "Poorly-graded gravel",
    "GM": "Silty gravel",
    "GC": "Clayey gravel",
    "SW": "Well-graded sand",
    "SP": "Poorly-graded sand",
    "SM": "Silty sand",
    "SC": "Clayey sand",
    "ML": "Silt (low plasticity)",
    "CL": "Clay (low plasticity)",
    "OL": "Organic silt/clay (low plasticity)",
    "MH": "Silt (high plasticity)",
    "CH": "Clay (high plasticity)",
    "OH": "Organic silt/clay (high plasticity)",
    "Pt": "Peat"
}

MOISTURE_STATES = ["dry", "slightly moist", "moist", "very moist", "wet"]
CONSISTENCY_STATES = ["very soft", "soft", "firm", "stiff", "very stiff", "hard"]


@tool
def validate_uscs_code(code: str) -> dict:
    """Validate if a string is a standard AS 1726 / USCS soil classification code."""
    if not code:
        return {"valid": False, "error": "Code is empty"}
    
    code = code.upper().strip()
    if code in USCS_CODES:
        return {"valid": True, "name": USCS_CODES[code]}
    
    return {
        "valid": False, 
        "error": f"Invalid USCS code: {code}",
        "suggestion": "Check AS 1726 Table 2 - closest valid codes: " + 
                      ", ".join(list(USCS_CODES.keys())[:5])
    }


@tool
def build_soil_description(
    uscs_code: str,
    colour: str,
    moisture: str,
    consistency: str,
    structure: str = None,
    inclusions: str = None
) -> str:
    """Construct a formal soil description string per AS 1726:2017 standards."""
    name = USCS_CODES.get(uscs_code, "Soil")
    desc = f"{name}: {colour.upper()}, {moisture}, {consistency}"
    if structure:
        desc += f", {structure}"
    if inclusions:
        desc += f", with {inclusions}"
    return desc


@tool
def validate_depth_interval(depth_from: float, depth_to: float, existing_layers: list) -> dict:
    """Check for depth overlaps or invalid ranges in the borehole log."""
    if depth_to <= depth_from:
        return {"valid": False, "error": "Depth To must be greater than Depth From"}
    
    for layer in existing_layers:
        if (depth_from < layer["depth_to"]) and (depth_to > layer["depth_from"]):
            return {"valid": False, "error": f"Interval overlaps with existing layer {layer['depth_from']}-{layer['depth_to']}m"}
            
    return {"valid": True}


@tool
def get_consistency_options() -> list:
    """Return valid AS 1726 consistency terms."""
    return CONSISTENCY_STATES

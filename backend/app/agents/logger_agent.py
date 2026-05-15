# app/agents/logger_agent.py

from app.state.borehole import BoreholeState, SoilLayer
from app.tools.as1726 import validate_depth_interval


async def logger_agent(state: BoreholeState) -> dict:
    """
    Commits current_layer to the soil_layers list after QA passes.
    Validates depth, checks for gaps, appends to log.
    """
    current = state.get("current_layer") or {}
    existing = list(state.get("soil_layers") or [])

    if not current.get("uscs_code"):
        return {
            "error": "logger_agent: Cannot log - layer has no USCS code",
            "last_agent": "logger_agent",
        }

    depth_check = validate_depth_interval.invoke({
        "depth_from": current.get("depth_from", 0.0),
        "depth_to": current.get("depth_to", 0.0),
        "existing_layers": existing,
    })

    if not depth_check["valid"]:
        return {
            "error": f"logger_agent: {depth_check['error']}",
            "last_agent": "logger_agent",
        }

    # Check for depth gap with last logged layer
    gap_warning = None
    if existing:
        last_depth_to = max(l["depth_to"] for l in existing)
        if current.get("depth_from", 0) > last_depth_to + 0.01:
            gap_warning = (f"WARNING: Gap in log between {last_depth_to}m "
                           f"and {current.get('depth_from')}m - review required")

    new_layer: SoilLayer = {
        "depth_from": current["depth_from"],
        "depth_to": current["depth_to"],
        "uscs_code": current["uscs_code"],
        "description": current.get("description", ""),
        "colour": current.get("colour", ""),
        "moisture": current.get("moisture", ""),
        "consistency": current.get("consistency", ""),
        "structure": current.get("structure", ""),
        "inclusions": current.get("inclusions", ""),
    }

    existing.append(new_layer)

    return {
        "soil_layers": existing,
        "current_layer": None,         # clear for next interval
        "last_agent": "logger_agent",
        "error": gap_warning,          # non-fatal, just a warning
    }

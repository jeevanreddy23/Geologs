from app.state.borehole import BoreholeState

async def validation_agent(state: BoreholeState) -> dict:
    """Validates input data integrity before processing."""
    errors = []
    if not state.get("project_id"):
        errors.append("Missing project_id")
    if not state.get("borehole_id"):
        errors.append("Missing borehole_id")
    if state.get("depth_from", 0) > state.get("depth_to", 0):
        errors.append("depth_from cannot be greater than depth_to")
    
    return {
        "validation_errors": errors,
        "error": "Validation failed" if errors else None,
        "last_agent": "validation_agent"
    }

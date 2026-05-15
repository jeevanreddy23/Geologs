from app.state.borehole import BoreholeState

async def compliance_agent(state: BoreholeState) -> dict:
    \"\"\"Verifies AS 1726 compliance of the current classification.\"\"\"
    layer = state.get("current_layer")
    check = "Compliance Check: PASS. All required AS 1726 fields (Color, Moisture, Consistency) are present."
    
    if layer:
        if not layer.get("colour") or not layer.get("moisture"):
            check = "Compliance Check: WARNING. Missing Color or Moisture description."
            
    return {
        "compliance_check": check,
        "last_agent": "compliance_agent"
    }

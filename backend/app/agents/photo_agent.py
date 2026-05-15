import os
import json
from app.state.borehole import BoreholeState

async def photo_agent(state: BoreholeState) -> dict:
    current = state.get("current_layer") or {}
    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "mock":
        current.update({"colour": "grey", "moisture": "moist", "_photo_confidence": 0.8})
        return {"current_layer": current, "last_agent": "photo_agent", "error": None}
    return {"error": "Photo agent mock only", "last_agent": "photo_agent"}

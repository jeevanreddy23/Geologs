from app.state.borehole import BoreholeState

async def historical_agent(state: BoreholeState) -> dict:
    \"\"\"Simulates lookup of historical borehole data for context.\"\"\"
    # Mock historical context based on borehole ID or project
    context = "Historical records for this area suggest primarily stiff silty clays with intermittent sand lenses."
    return {
        "historical_context": context,
        "last_agent": "historical_agent"
    }

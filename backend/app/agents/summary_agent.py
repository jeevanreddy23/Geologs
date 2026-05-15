from app.state.borehole import BoreholeState

async def summary_agent(state: BoreholeState) -> dict:
    \"\"\"Generates a natural language executive summary of the borehole status.\"\"\"
    summary = f"Borehole {state.get('borehole_id')} processed. "
    summary += f"Total of {len(state.get('soil_layers', []))} layers identified. "
    if state.get('qa_passed'):
        summary += "QA verification successful."
    else:
        summary += "Awaiting final QA."
        
    return {
        "executive_summary": summary,
        "last_agent": "summary_agent"
    }

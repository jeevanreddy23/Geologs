from app.state.borehole import BoreholeState

async def dispatch_agent(state: BoreholeState) -> dict:
    """Final node: Marks the borehole as complete and ready for delivery."""
    return {
        "is_dispatched": True,
        "dispatch_status": "Completed and notified via Project Pipeline",
        "last_agent": "dispatch_agent"
    }

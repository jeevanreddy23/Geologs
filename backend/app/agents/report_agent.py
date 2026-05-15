# app/agents/report_agent.py

import os
from app.state.borehole import BoreholeState
from app.tools.reporting import generate_borehole_log_pdf


async def report_agent(state: BoreholeState) -> dict:
    """Generates AS 1726:2017 PDF borehole log from logged soil_layers."""
    layers = state.get("soil_layers") or []
    if not layers:
        return {
            "error": "report_agent: No logged layers to report",
            "last_agent": "report_agent",
        }

    output_dir = os.getenv("REPORT_OUTPUT_DIR", "/tmp/autosoil_reports")
    filename = f"{state.get('borehole_id', 'BH-unknown')}_{state.get('project_id', 'proj')}.pdf"
    output_path = os.path.join(output_dir, filename)

    result = generate_borehole_log_pdf.invoke({
        "project_name": state.get("project_name", "Unknown Project"),
        "borehole_id": state.get("borehole_id", "BH-??"),
        "soil_layers": layers,
        "test_results": state.get("test_results") or [],
        "output_path": output_path,
    })

    if not result["success"]:
        return {
            "error": f"report_agent: PDF generation failed - {result['error']}",
            "last_agent": "report_agent",
        }

    return {
        "report_path": result["path"],
        "last_agent": "report_agent",
        "error": None,
    }

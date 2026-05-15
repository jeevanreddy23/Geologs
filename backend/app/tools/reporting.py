# app/tools/reporting.py

import os
from datetime import datetime
from langchain_core.tools import tool


@tool
def generate_borehole_log_pdf(
    project_name: str,
    borehole_id: str,
    soil_layers: list,
    test_results: list,
    output_path: str,
) -> dict:
    """Generate a PDF borehole log compliant with AS 1726:2017 format."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        )
        from reportlab.lib.styles import getSampleStyleSheet

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        # Header
        elements.append(Paragraph(f"BOREHOLE LOG - {borehole_id}", styles["Heading1"]))
        elements.append(Paragraph(f"Project: {project_name}", styles["Normal"]))
        elements.append(Paragraph(
            f"Logged: {datetime.now().strftime('%d %b %Y')} | Standard: AS 1726:2017",
            styles["Normal"]
        ))
        elements.append(Spacer(1, 12))

        # Soil table
        table_data = [["Depth From", "Depth To", "USCS", "Description",
                        "Colour", "Moisture", "Consistency"]]
        for layer in soil_layers:
            table_data.append([
                f"{layer.get('depth_from', '')}m",
                f"{layer.get('depth_to', '')}m",
                layer.get("uscs_code", ""),
                layer.get("description", "")[:60],
                layer.get("colour", ""),
                layer.get("moisture", ""),
                layer.get("consistency", ""),
            ])

        t = Table(table_data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ]))
        elements.append(t)

        doc.build(elements)
        return {"success": True, "path": output_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

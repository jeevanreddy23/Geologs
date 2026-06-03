import json
import math
import re
import statistics
import time
import uuid
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

def _draw_sts_logo(document: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    # A placeholder for the STS logo
    document.setFillColor(colors.HexColor("#1b5e20"))
    document.setFont("Helvetica-Bold", 30)
    document.drawString(x, y - 25, "STS")
    document.setFont("Helvetica-Bold", 10)
    document.drawString(x, y - 36, "GEOTECHNICS PTY LTD")
    document.setFillColor(colors.HexColor("#7f8c8d"))
    document.setFont("Helvetica", 6)
    document.drawString(x, y - 44, "CONSULTING GEOTECHNICAL ENGINEERS")

def _draw_header(document: canvas.Canvas, width: float, height: float, analysis: dict[str, Any]) -> None:
    margin = 30
    w = width - 2 * margin
    document.setStrokeColor(colors.black)
    document.setLineWidth(0.5)

    # Top border box
    y_top = height - margin
    header_h = 90
    y_bottom = y_top - header_h
    document.rect(margin, y_bottom, w, header_h)

    # Logo
    _draw_sts_logo(document, margin + 5, y_top - 5, 120, 50)

    # Title
    document.setFillColor(colors.black)
    document.setFont("Helvetica", 20)
    document.drawCentredString(width / 2, y_top - 35, "BOREHOLE LOG")

    # BH ID Box
    bh_id = analysis.get("project", {}).get("boreholeId") or "BH01"
    document.line(width - margin - 150, y_top, width - margin - 150, y_bottom)
    document.setFont("Helvetica", 16)
    document.drawString(width - margin - 145, y_top - 20, "BH ID: ")
    document.setFont("Helvetica-Bold", 20)
    document.drawRightString(width - margin - 5, y_top - 45, bh_id)

    # Metadata rows
    meta_y_top = y_bottom
    meta_h = 30
    document.rect(margin, meta_y_top - meta_h, w, meta_h)
    
    col1 = margin + 2
    col2 = margin + 60
    col3 = margin + 350
    col4 = margin + 400
    
    # Client / Date
    document.setFont("Helvetica-Bold", 7)
    document.drawString(col1, meta_y_top - 8, "Client")
    document.setFont("Helvetica", 7)
    document.drawString(col2, meta_y_top - 8, analysis.get("project", {}).get("client") or "By Group Pty Ltd")

    document.setFont("Helvetica-Bold", 7)
    document.drawString(col3, meta_y_top - 8, "Date")
    document.setFont("Helvetica", 7)
    document.drawString(col4, meta_y_top - 8, analysis.get("project", {}).get("inspectionDate") or "22 May 2026")

    # Job No / Logged By / Review By
    document.setFont("Helvetica-Bold", 7)
    document.drawString(col1, meta_y_top - 18, "Job No.")
    document.setFont("Helvetica", 7)
    document.drawString(col2, meta_y_top - 18, analysis.get("project", {}).get("projectNumber") or "32904/2304E-G")

    document.setFont("Helvetica-Bold", 7)
    document.drawString(col3, meta_y_top - 18, "Logged By")
    document.setFont("Helvetica", 7)
    document.drawString(col4, meta_y_top - 18, "AI")
    
    document.setFont("Helvetica-Bold", 7)
    document.drawString(col3 + 100, meta_y_top - 18, "Review By")

    # Address / Location #
    document.setFont("Helvetica-Bold", 7)
    document.drawString(col1, meta_y_top - 28, "Address")
    document.setFont("Helvetica", 7)
    document.drawString(col2, meta_y_top - 28, analysis.get("project", {}).get("address") or "-")

    document.setFont("Helvetica-Bold", 7)
    document.drawString(col3, meta_y_top - 28, "Location #")
    document.setFont("Helvetica", 7)
    document.drawString(col4, meta_y_top - 28, "-")

    # Second meta row
    meta2_y_top = meta_y_top - meta_h
    meta2_h = 20
    document.rect(margin, meta2_y_top - meta2_h, w, meta2_h)
    
    col3_2 = margin + 250
    col4_2 = margin + 300
    col5_2 = margin + 400
    col6_2 = margin + 450

    # Drill contractor, RL, Drill bit
    document.setFont("Helvetica-Bold", 7)
    document.drawString(col1, meta2_y_top - 8, "Drilling Contractor")
    document.setFont("Helvetica", 7)
    document.drawString(col1 + 80, meta2_y_top - 8, "AutoSoil")

    document.setFont("Helvetica-Bold", 7)
    document.drawString(col3_2, meta2_y_top - 8, "Surface RL")
    document.setFont("Helvetica", 7)
    document.drawString(col4_2, meta2_y_top - 8, "-")

    document.setFont("Helvetica-Bold", 7)
    document.drawString(col5_2, meta2_y_top - 8, "Drill Bit")
    document.setFont("Helvetica", 7)
    document.drawString(col6_2, meta2_y_top - 8, "Core")

    # Plant, Incl, Hole Ø
    document.setFont("Helvetica-Bold", 7)
    document.drawString(col1, meta2_y_top - 18, "Plant")
    document.setFont("Helvetica", 7)
    document.drawString(col1 + 80, meta2_y_top - 18, "-")

    document.setFont("Helvetica-Bold", 7)
    document.drawString(col3_2, meta2_y_top - 18, "Inclination")
    document.setFont("Helvetica", 7)
    document.drawString(col4_2, meta2_y_top - 18, "90°")

    document.setFont("Helvetica-Bold", 7)
    document.drawString(col5_2, meta2_y_top - 18, "Hole Ø (mm)")
    document.setFont("Helvetica", 7)
    document.drawString(col6_2, meta2_y_top - 18, "-")

def _draw_vertical_string(document, x, y, text, font="Helvetica", size=6):
    document.saveState()
    document.translate(x, y)
    document.rotate(90)
    document.setFont(font, size)
    document.drawString(0, 0, text)
    document.restoreState()

def _draw_log_table_header(document: canvas.Canvas, width: float, height: float):
    margin = 30
    w = width - 2 * margin
    y_top = height - margin - 90 - 30 - 20
    header_h = 70
    y_bottom = y_top - header_h
    document.rect(margin, y_bottom, w, header_h)

    # Columns
    cols = [
        ("METHOD", 20),
        ("Flush Return", 15),
        ("TCR %", 15),
        ("RQD %", 15),
        ("DEPTH (m)", 30),
        ("GRAPHIC\nLOG", 20),
        ("RL (m AHD)", 20),
        ("MATERIAL DESCRIPTION", 140),
        ("WEATHERING", 20),
        ("ESTIMATED\nSTRENGTH\nIs(50)\n▼ - Axial\n▽ - Diametral", 50),
        ("DISCONTINUITIES\n& ADDITIONAL DATA", 120),
        ("FRACTURE\nSPACING", 70)
    ]
    
    x = margin
    for label, cw in cols:
        document.line(x, y_top, x, y_bottom)
        cx = x + cw/2
        
        # Determine if vertical
        if label in ["METHOD", "Flush Return", "TCR %", "RQD %", "DEPTH (m)", "RL (m AHD)", "WEATHERING"]:
            _draw_vertical_string(document, cx - 2, y_bottom + 5, label, size=6)
        elif "STRENGTH" in label:
            document.setFont("Helvetica", 5)
            lines = label.split('\n')
            for i, line in enumerate(lines):
                document.drawCentredString(cx, y_top - 8 - i*6, line)
            
            # Draw strength sub-columns
            sub_w = cw / 6
            sx = x
            for subl in ["VL 0.1", "L 0.3", "M 1", "H 3", "VH 10", "EH"]:
                document.line(sx, y_bottom, sx, y_bottom + 15)
                _draw_vertical_string(document, sx + sub_w/2 - 2, y_bottom + 2, subl, size=4)
                sx += sub_w
            document.line(x, y_bottom + 15, x + cw, y_bottom + 15)
        elif "FRACTURE" in label:
            document.setFont("Helvetica", 5)
            for i, line in enumerate(label.split('\n')):
                document.drawCentredString(cx, y_top - 8 - i*6, line)
            
            sub_w = cw / 5
            sx = x
            for subl in ["30", "100", "300", "1000", "3000"]:
                document.line(sx, y_bottom, sx, y_bottom + 15)
                _draw_vertical_string(document, sx + sub_w/2 - 2, y_bottom + 2, subl, size=5)
                sx += sub_w
            document.line(x, y_bottom + 15, x + cw, y_bottom + 15)
        else:
            document.setFont("Helvetica", 6)
            lines = label.split('\n')
            for i, line in enumerate(lines):
                document.drawCentredString(cx, y_top - 10 - i*8, line)
        
        x += cw
    document.line(x, y_top, x, y_bottom) # Final line

def test():
    pdf_path = Path("test_out.pdf")
    document = canvas.Canvas(str(pdf_path), pagesize=A4, pageCompression=0)
    width, height = A4
    _draw_header(document, width, height, {})
    _draw_log_table_header(document, width, height)
    
    # Body lines
    margin = 30
    w = width - 2 * margin
    y_top = height - margin - 90 - 30 - 20 - 70
    y_bottom = margin + 20
    
    cols = [20, 15, 15, 15, 30, 20, 20, 140, 20, 50, 120, 70]
    x = margin
    for cw in cols:
        document.line(x, y_top, x, y_bottom)
        x += cw
    document.line(x, y_top, x, y_bottom)
    document.line(margin, y_bottom, margin + sum(cols), y_bottom)
    
    document.save()

if __name__ == "__main__":
    test()

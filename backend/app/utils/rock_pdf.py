# backend/app/utils/rock_pdf.py
import re
import uuid
import math
import random
from pathlib import Path
from typing import Any
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

def safe_float(v, default=0.0):
    if v is None or v == "":
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default

def generate_openground_style_pdf(data: dict, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    borehole = data.get("borehole", {})
    borehole_id = borehole.get("borehole_id") or "BH"
    
    # Safe PDF name
    safe_bh = re.sub(r'[^A-Za-z0-9_-]+', '-', borehole_id)
    pdf_path = output_dir / f"openground_log_{safe_bh}_{uuid.uuid4().hex[:8]}.pdf"
    
    # Calculate depth range
    depth_from = safe_float(borehole.get("depth_from"), 0.0)
    depth_to = safe_float(borehole.get("depth_to"), 5.0)
    depth_span = depth_to - depth_from
    if depth_span <= 0:
        depth_span = 5.0
        depth_to = depth_from + 5.0
        
    # Determine page division (5 meters per page)
    meters_per_page = 5.0
    pages_count = max(1, math.ceil(depth_span / meters_per_page))
    
    # ReportLab Canvas
    doc = canvas.Canvas(str(pdf_path), pagesize=A4, pageCompression=0)
    
    for page_idx in range(1, pages_count + 1):
        page_start = depth_from + (page_idx - 1) * meters_per_page
        page_end = min(depth_to, page_start + meters_per_page)
        
        # 1. Draw outer page frame (margins)
        # Margin is 36 pt. Left x=36, right x=559, top y=806, bottom y=36.
        doc.setStrokeColor(colors.HexColor("#0f172a"))
        doc.setLineWidth(1)
        doc.rect(36, 36, 523, 770, fill=0, stroke=1)
        
        # 2. Draw Header (y = 670 to 806)
        _draw_header_block(doc, data, page_idx, pages_count)
        
        # 3. Draw Columns Headers (y = 650 to 670)
        _draw_column_headers(doc)
        
        # 4. Draw Column Lines and Grid (y = 90 to 650)
        _draw_column_grid_lines(doc)
        
        # Helper to convert depth to y coordinate
        # y ranges from 90 (depth page_end) to 650 (depth page_start)
        scale_factor = 560.0 / meters_per_page # 560 pt / 5 m = 112 pt/m
        def depth_to_y(d):
            val = 650.0 - (d - page_start) * scale_factor
            return max(90.0, min(650.0, val))
            
        # 5. Draw Scale ticks (y = 90 to 650)
        _draw_depth_scale(doc, page_start, page_end, depth_to_y)
        
        # 6. Draw Lithology units
        _draw_lithologies(doc, data.get("lithology_units", []), page_start, page_end, depth_to_y)
        
        # 7. Draw Core Runs (TCR, RQD, Run No, Fracture Spacing)
        _draw_core_runs(doc, data.get("core_runs", []), page_start, page_end, depth_to_y)
        
        # 8. Draw Discontinuities
        _draw_discontinuities(doc, data.get("discontinuities", []), page_start, page_end, depth_to_y)
        
        # 9. Draw Footer Legend (y = 36 to 90)
        _draw_footer_legend(doc, page_idx, pages_count)
        
        # New page if not the last
        doc.showPage()
        
    doc.save()
    return pdf_path

def _draw_header_block(doc: canvas.Canvas, data: dict, page_idx: int, pages_count: int) -> None:
    project = data.get("project", {})
    borehole = data.get("borehole", {})
    
    # Outer header box
    doc.setStrokeColor(colors.HexColor("#0f172a"))
    doc.setLineWidth(1)
    doc.rect(36, 670, 523, 136, fill=0, stroke=1)
    
    # Title Block divider
    doc.line(400, 670, 400, 806)
    doc.line(36, 738, 400, 738)
    
    # Title
    doc.setFillColor(colors.HexColor("#0f172a"))
    doc.setFont("Helvetica-Bold", 14)
    doc.drawString(46, 782, "GEOTECHNICAL BOREHOLE LOG")
    doc.setFont("Helvetica", 7.5)
    doc.setFillColor(colors.HexColor("#475569"))
    doc.drawString(46, 770, "AS 1726-2017 STANDARDS COMPLIANT LOGGING SYSTEM")
    
    # Borehole ID Section (Top Right)
    doc.setFillColor(colors.HexColor("#0f172a"))
    doc.setFont("Helvetica-Bold", 8)
    doc.drawString(410, 792, "LOCATION ID:")
    doc.setFont("Helvetica-Bold", 20)
    doc.drawString(410, 768, str(borehole.get("borehole_id") or "BH-01"))
    
    # Page Indicator
    doc.setFont("Helvetica", 8)
    doc.drawString(410, 746, f"Sheet {page_idx} of {pages_count}")
    
    # Metadata labels & values (Left section: Project details)
    # y lines: row1 = 722, row2 = 708, row3 = 694, row4 = 680
    doc.setFont("Helvetica-Bold", 7)
    doc.setFillColor(colors.HexColor("#0f172a"))
    doc.drawString(46, 722, "PROJECT NO:")
    doc.drawString(46, 708, "CLIENT:")
    doc.drawString(46, 694, "SITE ADDRESS:")
    doc.drawString(46, 680, "INSPECTION DATE:")
    
    doc.setFont("Helvetica", 7)
    doc.drawString(120, 722, str(project.get("project_no") or project.get("projectNumber") or "PRJ-001"))
    doc.drawString(120, 708, str(project.get("client") or "Not Extracted"))
    doc.drawString(120, 694, str(project.get("address") or "Not Extracted"))
    doc.drawString(120, 680, str(project.get("date") or "Not Extracted"))
    
    # Metadata labels & values (Right section: Rig details)
    # y lines: row1 = 722, row2 = 708, row3 = 694, row4 = 680
    doc.setFont("Helvetica-Bold", 7)
    doc.drawString(220, 722, "SURFACE RL (m):")
    doc.drawString(220, 708, "HOLE DIA (mm):")
    doc.drawString(220, 694, "INCLINATION (°):")
    doc.drawString(220, 680, "DRILL BIT TYPE:")
    
    doc.setFont("Helvetica", 7)
    doc.drawString(300, 722, str(borehole.get("surface_rl") if borehole.get("surface_rl") is not None else "0.0"))
    doc.drawString(300, 708, str(borehole.get("hole_diameter_mm") if borehole.get("hole_diameter_mm") is not None else "96"))
    doc.drawString(300, 694, str(borehole.get("inclination") if borehole.get("inclination") is not None else "90") + "° (Vert)")
    doc.drawString(300, 680, str(borehole.get("drill_bit") or "NMLC"))
    
    # Metadata labels & values (Borehole ID section: Contractor, rig, logger)
    doc.setFont("Helvetica-Bold", 7)
    doc.drawString(410, 722, "CONTRACTOR:")
    doc.drawString(410, 708, "DRILL RIG:")
    doc.drawString(410, 694, "LOGGED BY:")
    doc.drawString(410, 680, "REVIEWED BY:")
    
    doc.setFont("Helvetica", 7)
    doc.drawString(480, 722, str(borehole.get("drilling_contractor") or "DrillCo Ltd"))
    doc.drawString(480, 708, str(borehole.get("rig") or "Talon 500"))
    doc.drawString(480, 694, str(project.get("logged_by") or "Engineer"))
    doc.drawString(480, 680, str(project.get("reviewed_by") or "Senior Geologist"))

def _draw_column_headers(doc: canvas.Canvas) -> None:
    # Outer column header box
    doc.setStrokeColor(colors.HexColor("#0f172a"))
    doc.setLineWidth(1)
    doc.rect(36, 650, 523, 20, fill=1, stroke=1)
    
    # Print labels
    doc.setFillColor(colors.HexColor("#0f172a"))
    doc.setFont("Helvetica-Bold", 7.5)
    
    # Col x boundaries: 36, 66, 91, 116, 136, 176, 216, 376, 406, 436, 519, 559
    headers = [
        ("Depth (m)", 40),
        ("TCR %", 70.5),
        ("RQD %", 95.5),
        ("Run", 120),
        ("Graphic", 143),
        ("Symbol", 182),
        ("Material Description of Rock Layer", 222),
        ("Weath", 380),
        ("Strength", 408),
        ("Discontinuities & Defects", 442),
        ("Frac Spac", 522.5)
    ]
    
    for text, x_coord in headers:
        doc.drawString(x_coord, 656, text)

def _draw_column_grid_lines(doc: canvas.Canvas) -> None:
    # Vertical grid lines
    # Col x boundaries: 36, 66, 91, 116, 136, 176, 216, 376, 406, 436, 519, 559
    doc.setStrokeColor(colors.HexColor("#475569"))
    doc.setLineWidth(0.75)
    for x in [66, 91, 116, 136, 176, 216, 376, 406, 436, 519]:
        doc.line(x, 90, x, 650)

def _draw_depth_scale(doc: canvas.Canvas, page_start: float, page_end: float, depth_to_y) -> None:
    doc.setStrokeColor(colors.HexColor("#0f172a"))
    doc.setLineWidth(0.75)
    doc.setFont("Helvetica-Bold", 6.5)
    doc.setFillColor(colors.HexColor("#0f172a"))
    
    d = page_start
    while d <= page_end + 0.01:
        y = depth_to_y(d)
        
        # Decide if major, medium or minor
        # We round to avoid floating point precision issues
        d_rounded = round(d, 2)
        is_major = abs(d_rounded - int(d_rounded)) < 0.01
        is_medium = abs(d_rounded - (int(d_rounded) + 0.5)) < 0.01
        
        if is_major:
            # line length 8 pt inside column (from x=66 left to x=58)
            doc.line(66, y, 58, y)
            doc.drawString(42, y - 2, f"{int(d_rounded)}.0")
        elif is_medium:
            # line length 5 pt (from x=66 to x=61)
            doc.line(66, y, 61, y)
        else:
            # line length 3 pt (from x=66 to x=63)
            doc.line(66, y, 63, y)
            
        d += 0.1

def _draw_lithologies(doc: canvas.Canvas, units: list[dict], page_start: float, page_end: float, depth_to_y) -> None:
    doc.setStrokeColor(colors.HexColor("#0f172a"))
    doc.setLineWidth(0.75)
    
    for u in units:
        u_from = safe_float(u.get("from") if u.get("from") is not None else u.get("depth_from"), 0.0)
        u_to = safe_float(u.get("to") if u.get("to") is not None else u.get("depth_to"), 5.0)
        
        # Check overlaps
        if u_to <= page_start or u_from >= page_end:
            continue
            
        u_start = max(page_start, u_from)
        u_finish = min(page_end, u_to)
        
        y_top = depth_to_y(u_start)
        y_bottom = depth_to_y(u_finish)
        
        # Draw bottom boundary line (from x=136 to x=436)
        # Avoid drawing on top line as it is the column header line
        if y_bottom > 90.1:
            doc.line(136, y_bottom, 436, y_bottom)
            
        # Draw vector patterns in Graphic Log column (x=136 to 176)
        material = (u.get("material") or "").upper()
        doc.saveState()
        # Set clip rectangle to Graphic Log cell
        p_clip = doc.beginPath()
        p_clip.rect(136, y_bottom, 40, y_top - y_bottom)
        doc.clipPath(p_clip, stroke=0, fill=0)
        
        if "SANDSTONE" in material:
            # Draw dot pattern
            doc.setFillColor(colors.HexColor("#64748b"))
            random.seed(u.get("id") or 42)
            for _ in range(35):
                rx = random.uniform(138, 174)
                ry = random.uniform(y_bottom + 2, y_top - 2)
                doc.circle(rx, ry, 0.75, fill=1, stroke=0)
        elif "SILTSTONE" in material or "CLAYSTONE" in material or "SHALE" in material:
            # Draw horizontal dashed lines
            doc.setStrokeColor(colors.HexColor("#64748b"))
            doc.setLineWidth(0.5)
            dy = y_bottom + 4
            while dy < y_top:
                doc.line(138, dy, 174, dy)
                dy += 4
        elif "CONCRETE" in material:
            # Draw concrete triangles and dots
            doc.setStrokeColor(colors.HexColor("#475569"))
            doc.setLineWidth(0.5)
            doc.setFillColor(colors.HexColor("#475569"))
            random.seed(u.get("id") or 42)
            for _ in range(8):
                tx = random.uniform(138, 170)
                ty = random.uniform(y_bottom + 4, y_top - 4)
                # draw a small triangle
                p_tri = doc.beginPath()
                p_tri.moveTo(tx, ty)
                p_tri.lineTo(tx + 3, ty + 4)
                p_tri.lineTo(tx - 3, ty + 4)
                p_tri.close()
                doc.drawPath(p_tri, stroke=1, fill=0)
            for _ in range(12):
                rx = random.uniform(138, 174)
                ry = random.uniform(y_bottom + 2, y_top - 2)
                doc.circle(rx, ry, 0.5, fill=1, stroke=0)
        else:
            # Default fallback: draw diagonal lines (soil symbol)
            doc.setStrokeColor(colors.HexColor("#cbd5e1"))
            doc.setLineWidth(0.5)
            offset = -30
            while offset < 50:
                doc.line(136 + max(0, offset), y_bottom + max(0, -offset), 136 + min(40, offset + 40), y_bottom + min(y_top - y_bottom, 40 - offset))
                offset += 8
        doc.restoreState()
        
        # Draw Symbol text centered
        doc.setFillColor(colors.HexColor("#0f172a"))
        doc.setFont("Helvetica-Bold", 7.5)
        symbol = u.get("uscs_symbol") or u.get("uscs_code") or ("SST" if "SANDSTONE" in material else "SLT" if "SILTSTONE" in material else "ROCK")
        doc.drawCentredString(156, (y_top + y_bottom) / 2 - 3, symbol)
        
        # Draw Description using Paragraph wrapped
        desc_text = u.get("description", "")
        # Add visual indicators for review status: AI suggested vs Approved
        desc_style = ParagraphStyle(
            'desc_para',
            fontName='Helvetica',
            fontSize=7,
            leading=8.5,
            textColor=colors.HexColor('#0f172a')
        )
        p = Paragraph(desc_text, desc_style)
        p_w, p_h = p.wrap(154, y_top - y_bottom - 4)
        p.drawOn(doc, 219, y_top - p_h - 2)
        
        # Weathering & Strength codes
        doc.setFont("Helvetica", 7.5)
        weathering = u.get("weathering", "") or ""
        strength = u.get("strength", "") or ""
        doc.drawCentredString(391, (y_top + y_bottom) / 2 - 3, weathering)
        doc.drawCentredString(421, (y_top + y_bottom) / 2 - 3, strength)

def _draw_core_runs(doc: canvas.Canvas, runs: list[dict], page_start: float, page_end: float, depth_to_y) -> None:
    doc.setStrokeColor(colors.HexColor("#0f172a"))
    doc.setLineWidth(0.75)
    doc.setFont("Helvetica", 7.5)
    doc.setFillColor(colors.HexColor("#0f172a"))
    
    for r in runs:
        r_from = safe_float(r.get("from") if r.get("from") is not None else r.get("depth_from") or r.get("depthFromM"), 0.0)
        r_to = safe_float(r.get("to") if r.get("to") is not None else r.get("depth_to") or r.get("depthToM"), 5.0)
        
        # Check overlaps
        if r_to <= page_start or r_from >= page_end:
            continue
            
        r_start = max(page_start, r_from)
        r_finish = min(page_end, r_to)
        
        y_top = depth_to_y(r_start)
        y_bottom = depth_to_y(r_finish)
        
        # Horizontal dividers for core runs (left margins and right margins)
        if y_bottom > 90.1:
            # Left columns dividers: Depth to Run (x=66 to 136)
            doc.line(66, y_bottom, 136, y_bottom)
            # Right column divider: Fracture Spacing (x=519 to 559)
            doc.line(519, y_bottom, 559, y_bottom)
            
        # Draw run parameters centered vertically in run cells
        y_mid = (y_top + y_bottom) / 2 - 3
        
        run_no = str(r.get("run_no") or r.get("runIndex") or "")
        tcr = str(r.get("tcr") if r.get("tcr") is not None else r.get("tcrPercent") or "")
        rqd = str(r.get("rqd") if r.get("rqd") is not None else r.get("rqdPercent") or "")
        frac = str(r.get("fracture_spacing_mm") or r.get("dominantJointSpacingMm") or "")
        
        if tcr and "%" not in tcr:
            tcr = f"{safe_float(tcr):.0f}%"
        if rqd and "%" not in rqd:
            rqd = f"{safe_float(rqd):.0f}%"
            
        doc.drawCentredString(78.5, y_mid, tcr)
        doc.drawCentredString(103.5, y_mid, rqd)
        doc.drawCentredString(126, y_mid, run_no)
        
        if frac:
            doc.drawCentredString(539, y_mid, f"{frac} mm" if "mm" not in frac.lower() and frac.isdigit() else frac)

def _draw_discontinuities(doc: canvas.Canvas, disconts: list[dict], page_start: float, page_end: float, depth_to_y) -> None:
    doc.setStrokeColor(colors.HexColor("#dc2626")) # Red line for defects
    doc.setLineWidth(0.75)
    doc.setFont("Helvetica", 6.5)
    doc.setFillColor(colors.HexColor("#0f172a"))
    
    # Sort by depth to handle overlapping text
    disconts_sorted = sorted(
        [d for d in disconts if page_start <= safe_float(d.get("depth"), 0.0) <= page_end],
        key=lambda x: safe_float(x.get("depth"), 0.0)
    )
    
    last_y = 999.0
    for d in disconts_sorted:
        d_depth = safe_float(d.get("depth"), 0.0)
        y_d = depth_to_y(d_depth)
        
        # Draw red defect tick (diagonal line in x=436 to 442)
        doc.line(436, y_d - 2, 442, y_d + 2)
        
        # Compile discontinuity description code: BP -5° PR RO SN etc.
        dtype = d.get("defect_type") or d.get("type") or ""
        angle = d.get("angle")
        shape = d.get("shape") or ""
        roughness = d.get("roughness") or ""
        infilling = d.get("infilling") or ""
        notes = d.get("notes") or ""
        
        code_parts = []
        if dtype: code_parts.append(str(dtype))
        if angle is not None: code_parts.append(f"{angle}°")
        if shape: code_parts.append(str(shape))
        if roughness: code_parts.append(str(roughness))
        if infilling: code_parts.append(str(infilling))
        if notes: code_parts.append(f"({notes})")
        
        code_str = f"{d_depth:.2f}m: " + " ".join(code_parts) if code_parts else f"{d_depth:.2f}m"
        
        # Prevent overlapping text by bumping y down slightly if too close
        y_text = y_d - 2
        if last_y - y_text < 8:
            y_text = last_y - 8
        last_y = y_text
        
        doc.drawString(446, y_text, code_str[:38])

def _draw_footer_legend(doc: canvas.Canvas, page_idx: int, pages_count: int) -> None:
    # Legend divider line at y = 90
    doc.setStrokeColor(colors.HexColor("#0f172a"))
    doc.setLineWidth(1)
    doc.line(36, 90, 559, 90)
    
    # Write legend text in small print
    doc.setFont("Helvetica-Bold", 6.5)
    doc.drawString(42, 78, "WEATHERING:")
    doc.setFont("Helvetica", 6)
    doc.drawString(42, 68, "FR = Fresh  |  SW = Slightly Weathered  |  MW = Moderately Weathered  |  HW = Highly Weathered  |  EW = Extremely Weathered")
    
    doc.setFont("Helvetica-Bold", 6.5)
    doc.drawString(42, 54, "STRENGTH:")
    doc.setFont("Helvetica", 6)
    doc.drawString(42, 44, "VL = Very Low  |  L = Low  |  M = Medium  |  H = High  |  VH = Very High  |  EH = Extremely High")
    
    doc.setFont("Helvetica-Bold", 6.5)
    doc.drawString(380, 78, "DEFECT TYPE CODES:")
    doc.setFont("Helvetica", 6)
    doc.drawString(380, 68, "BP = Bedding Plane  |  JN = Joint  |  VN = Vein")
    doc.drawString(380, 58, "CS = Clay Seam  |  SZ = Shear Zone  |  DB = Drilling Break")
    doc.drawString(380, 48, "PR = Planar  |  RO = Rough  |  CN = Clean  |  SN = Stained")
    
    # Sheet index
    doc.setFont("Helvetica-Bold", 8)
    doc.drawRightString(546, 78, f"SHEET {page_idx} OF {pages_count}")

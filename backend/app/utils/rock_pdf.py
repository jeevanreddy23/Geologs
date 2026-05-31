import re
import uuid
import math
import random
from pathlib import Path
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
    
    safe_bh = re.sub(r'[^A-Za-z0-9_-]+', '-', borehole_id)
    pdf_path = output_dir / f"openground_log_{safe_bh}_{uuid.uuid4().hex[:8]}.pdf"
    
    depth_from = safe_float(borehole.get("depth_from"), 0.0)
    depth_to = safe_float(borehole.get("depth_to"), 5.0)
    depth_span = depth_to - depth_from
    if depth_span <= 0:
        depth_span = 5.0
        depth_to = depth_from + 5.0
        
    meters_per_page = 5.0
    pages_count = max(1, math.ceil(depth_span / meters_per_page))
    
    doc = canvas.Canvas(str(pdf_path), pagesize=A4, pageCompression=0)
    
    for page_idx in range(1, pages_count + 1):
        page_start = depth_from + (page_idx - 1) * meters_per_page
        page_end = min(depth_to, page_start + meters_per_page)
        
        doc.setStrokeColor(colors.black)
        doc.setLineWidth(0.75)
        
        _draw_header(doc, data, page_idx, pages_count)
        _draw_column_headers(doc)
        _draw_column_lines(doc)
        
        scale_factor = 540.0 / meters_per_page # 620 to 80 = 540 pt
        def depth_to_y(d):
            val = 620.0 - (d - page_start) * scale_factor
            return max(80.0, min(620.0, val))
            
        _draw_depth_scale(doc, page_start, page_end, depth_to_y)
        _draw_lithologies(doc, data.get("lithology_units", []), page_start, page_end, depth_to_y)
        _draw_core_runs(doc, data.get("core_runs", []), page_start, page_end, depth_to_y)
        _draw_discontinuities(doc, data.get("discontinuities", []), page_start, page_end, depth_to_y)
        
        _draw_footer(doc, page_idx, pages_count)
        
        doc.showPage()
        
    doc.save()
    return pdf_path

def _draw_header(doc: canvas.Canvas, data: dict, page_idx: int, pages_count: int) -> None:
    project = data.get("project", {})
    borehole = data.get("borehole", {})
    
    # Outer box for entire header
    doc.rect(30, 710, 535, 100, fill=0, stroke=1)
    
    # Title row
    doc.line(30, 770, 565, 770)
    
    # Logo text
    doc.setFont("Helvetica-Bold", 36)
    doc.setFillColor(colors.HexColor("#2f7d45")) # STS Green
    doc.drawString(35, 785, "STS")
    doc.setFont("Helvetica-Bold", 8)
    doc.setFillColor(colors.gray)
    doc.drawString(35, 775, "GEOTECHNICS PTY LTD")
    doc.setFont("Helvetica", 6)
    doc.drawString(35, 772, "CONSULTING GEOTECHNICAL ENGINEERS")
    
    # Title
    doc.setFillColor(colors.black)
    doc.setFont("Helvetica", 18)
    doc.drawCentredString(297, 785, "BOREHOLE LOG")
    
    # BH ID Box
    doc.line(400, 770, 400, 810)
    doc.setFont("Helvetica", 16)
    doc.drawRightString(560, 792, f"BH ID: {borehole.get('borehole_id') or 'BH01'}")
    
    # Metadata Grid Lines
    doc.line(30, 750, 565, 750)
    doc.line(30, 730, 565, 730)
    
    # Cols: 30, 250, 400, 480, 565
    doc.line(250, 710, 250, 770)
    doc.line(400, 710, 400, 770)
    doc.line(480, 710, 480, 770)

    doc.setFont("Helvetica-Bold", 7)
    # Row 1 (750 to 770)
    doc.drawString(32, 760, "Client")
    doc.drawString(32, 752, "Job No.")
    doc.drawString(252, 760, "Date")
    doc.drawString(252, 752, "Logged By")
    doc.drawString(402, 752, "Review By")

    doc.setFont("Helvetica", 7)
    doc.drawString(70, 760, str(project.get("client") or ""))
    doc.drawString(70, 752, str(project.get("project_no") or project.get("projectNumber") or ""))
    doc.drawString(290, 760, str(project.get("date") or ""))
    doc.drawString(290, 752, str(project.get("logged_by") or ""))
    doc.drawString(440, 752, str(project.get("reviewed_by") or ""))

    # Row 2 (730 to 750)
    doc.setFont("Helvetica-Bold", 7)
    doc.drawString(32, 738, "Address")
    doc.drawString(252, 738, "Location #")
    
    doc.setFont("Helvetica", 7)
    doc.drawString(70, 738, str(project.get("address") or ""))
    doc.drawString(290, 738, str(project.get("location_no") or "-"))

    # Row 3 (710 to 730)
    doc.setFont("Helvetica-Bold", 7)
    doc.drawString(32, 720, "Drilling Contractor")
    doc.drawString(32, 712, "Plant")
    doc.drawString(252, 720, "Surface RL")
    doc.drawString(252, 712, "Inclination")
    doc.drawString(402, 720, "Drill Bit")
    doc.drawString(402, 712, "Hole Ø (mm)")

    doc.setFont("Helvetica", 7)
    doc.drawString(110, 720, str(borehole.get("drilling_contractor") or ""))
    doc.drawString(110, 712, str(borehole.get("rig") or ""))
    
    s_rl = borehole.get("surface_rl")
    doc.drawString(300, 720, f"≈{s_rl} m (AHD)" if s_rl else "")
    
    inc = borehole.get("inclination")
    doc.drawString(300, 712, f"{inc}°" if inc else "")
    
    doc.drawString(450, 720, str(borehole.get("drill_bit") or ""))
    doc.drawString(450, 712, str(borehole.get("hole_diameter_mm") or ""))

def _draw_column_headers(doc: canvas.Canvas) -> None:
    doc.rect(30, 620, 535, 90, fill=0, stroke=1)
    doc.setFont("Helvetica", 7)
    
    # 1. METHOD
    doc.saveState()
    doc.translate(40, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "METHOD")
    doc.restoreState()
    
    # 2. Flush Return
    doc.saveState()
    doc.translate(60, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "Flush Return")
    doc.restoreState()
    
    # 3. TCR
    doc.saveState()
    doc.translate(80, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "TCR %")
    doc.restoreState()
    
    # 4. RQD
    doc.saveState()
    doc.translate(100, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "RQD %")
    doc.restoreState()
    
    # 5. DEPTH
    doc.saveState()
    doc.translate(120, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "DEPTH (m)")
    doc.restoreState()
    
    # 6. GRAPHIC
    doc.saveState()
    doc.translate(155, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "GRAPHIC")
    doc.drawString(0, -10, "LOG")
    doc.restoreState()
    
    # 7. RL
    doc.saveState()
    doc.translate(185, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "RL (m AHD)")
    doc.restoreState()
    
    # 8. MATERIAL
    doc.drawCentredString(275, 665, "MATERIAL DESCRIPTION")
    
    # 9. WEATHERING
    doc.saveState()
    doc.translate(365, 630)
    doc.rotate(90)
    doc.drawString(0, 0, "WEATHERING")
    doc.restoreState()
    
    # 10. STRENGTH
    doc.setFont("Helvetica", 5)
    doc.drawCentredString(410, 702, "ESTIMATED")
    doc.drawCentredString(410, 695, "STRENGTH")
    doc.drawCentredString(410, 688, "Is(50)")
    doc.drawCentredString(410, 681, "▼ - Axial")
    doc.drawCentredString(410, 674, "▽ - Diametral")
    
    # Draw strength grid ticks
    s_x = 385
    for lbl in ["VL 0.1", "L 0.3", "M 1", "H 3", "VH 10", "EH"]:
        doc.saveState()
        doc.translate(s_x + 4, 622)
        doc.rotate(90)
        doc.drawString(0, 0, lbl)
        doc.restoreState()
        s_x += 8.33
        
    doc.line(385, 670, 435, 670)
    
    # 11. DISCONTINUITIES
    doc.setFont("Helvetica", 7)
    doc.drawCentredString(477, 665, "DISCONTINUITIES")
    doc.drawCentredString(477, 655, "& ADDITIONAL DATA")
    
    # 12. FRACTURE SPACING
    doc.setFont("Helvetica", 5)
    doc.drawCentredString(542, 700, "FRACTURE")
    doc.drawCentredString(542, 693, "SPACING")
    doc.line(520, 660, 565, 660)
    
    f_x = 520
    for lbl in ["30", "100", "300", "1000", "3000"]:
        doc.saveState()
        doc.translate(f_x + 4, 622)
        doc.rotate(90)
        doc.drawString(0, 0, lbl)
        doc.restoreState()
        f_x += 9

def _draw_column_lines(doc: canvas.Canvas) -> None:
    # 13 boundaries: [30, 50, 70, 90, 110, 140, 175, 195, 355, 385, 435, 520, 565]
    cols = [30, 50, 70, 90, 110, 140, 175, 195, 355, 385, 435, 520, 565]
    for x in cols:
        doc.line(x, 80, x, 710)
        
    # Strength sub-grid
    doc.setStrokeColor(colors.gray)
    doc.setLineWidth(0.5)
    s_x = 385
    for _ in range(5):
        s_x += 8.33
        doc.line(s_x, 80, s_x, 670)
        
    # Fracture sub-grid
    f_x = 520
    for _ in range(4):
        f_x += 9
        doc.line(f_x, 80, f_x, 660)
        
    doc.setStrokeColor(colors.black)
    doc.setLineWidth(0.75)

def _draw_depth_scale(doc: canvas.Canvas, page_start: float, page_end: float, depth_to_y) -> None:
    doc.setFont("Helvetica", 7)
    
    d = page_start
    while d <= page_end + 0.01:
        y = depth_to_y(d)
        d_rounded = round(d, 2)
        is_major = abs(d_rounded - int(d_rounded)) < 0.01
        
        if is_major:
            doc.line(140, y, 130, y)
            doc.drawCentredString(125, y - 2, f"{int(d_rounded)}")
        else:
            doc.line(140, y, 135, y)
            
        d += 0.1
        
    # Draw horizontal scale lines across the whole table for major depths
    doc.setStrokeColor(colors.HexColor("#e2e8f0"))
    doc.setLineWidth(0.5)
    d = page_start
    while d <= page_end + 0.01:
        d_rounded = round(d, 2)
        if abs(d_rounded - int(d_rounded)) < 0.01:
            y = depth_to_y(d)
            if y < 619 and y > 81:
                # doc.line(195, y, 355, y)
                pass # The reference PDF doesn't have horizontal lines crossing description
        d += 1.0
    doc.setStrokeColor(colors.black)
    doc.setLineWidth(0.75)

def _draw_lithologies(doc: canvas.Canvas, units: list[dict], page_start: float, page_end: float, depth_to_y) -> None:
    for u in units:
        u_from = safe_float(u.get("from") if u.get("from") is not None else u.get("depth_from"), 0.0)
        u_to = safe_float(u.get("to") if u.get("to") is not None else u.get("depth_to"), 5.0)
        
        if u_to <= page_start or u_from >= page_end: continue
            
        u_start = max(page_start, u_from)
        u_finish = min(page_end, u_to)
        
        y_top = depth_to_y(u_start)
        y_bottom = depth_to_y(u_finish)
        
        if y_bottom > 80.1:
            doc.line(140, y_bottom, 385, y_bottom)
            
        # Draw graphic (140 to 175)
        material = (u.get("material") or "").upper()
        doc.saveState()
        p_clip = doc.beginPath()
        p_clip.rect(140, y_bottom, 35, y_top - y_bottom)
        doc.clipPath(p_clip, stroke=0, fill=0)
        
        if "SILTSTONE" in material or "SHALE" in material:
            doc.setStrokeColor(colors.gray)
            doc.setLineWidth(0.5)
            dy = y_bottom + 2
            while dy < y_top:
                doc.line(140, dy, 175, dy)
                dy += 2
        elif "SANDSTONE" in material:
            doc.setFillColor(colors.gray)
            random.seed(u.get("id") or 42)
            for _ in range(30):
                doc.circle(random.uniform(142, 173), random.uniform(y_bottom+1, y_top-1), 0.5, fill=1, stroke=0)
        else:
            doc.setStrokeColor(colors.lightgrey)
            offset = -30
            while offset < 50:
                doc.line(140+max(0,offset), y_bottom+max(0,-offset), 140+min(35,offset+35), y_bottom+min(y_top-y_bottom, 35-offset))
                offset += 5
        doc.restoreState()
        
        # Description
        desc_text = u.get("description", "")
        if desc_text:
            desc_style = ParagraphStyle('desc_para', fontName='Helvetica', fontSize=7, leading=8)
            p = Paragraph(desc_text, desc_style)
            p_w, p_h = p.wrap(156, y_top - y_bottom - 4)
            p.drawOn(doc, 197, y_top - p_h - 2)
            
        # Weathering
        doc.setFont("Helvetica", 7)
        weathering = u.get("weathering", "") or ""
        doc.drawCentredString(370, y_top - 12, weathering)
        
        # Strength bar
        strength = (u.get("strength") or "").upper()
        # Map strength to x-width in the grid
        st_map = {"VL": 1, "L": 2, "M": 3, "H": 4, "VH": 5, "EH": 6}
        st_val = st_map.get(strength)
        if st_val:
            st_x = 385 + (st_val * 8.33)
            doc.setFillColor(colors.lightgrey)
            doc.rect(385, y_bottom, st_x - 385, y_top - y_bottom, fill=1, stroke=0)
            doc.setFillColor(colors.black)

def _draw_core_runs(doc: canvas.Canvas, runs: list[dict], page_start: float, page_end: float, depth_to_y) -> None:
    doc.setFont("Helvetica", 7)
    
    for r in runs:
        r_from = safe_float(r.get("from") if r.get("from") is not None else r.get("depth_from") or r.get("depthFromM"), 0.0)
        r_to = safe_float(r.get("to") if r.get("to") is not None else r.get("depth_to") or r.get("depthToM"), 5.0)
        
        if r_to <= page_start or r_from >= page_end: continue
            
        r_start = max(page_start, r_from)
        r_finish = min(page_end, r_to)
        y_top = depth_to_y(r_start)
        y_bottom = depth_to_y(r_finish)
        
        if y_bottom > 80.1:
            doc.line(30, y_bottom, 110, y_bottom)
            
        y_mid = (y_top + y_bottom) / 2
        
        # Method NMLC
        doc.saveState()
        doc.translate(40, y_mid - 12)
        doc.rotate(90)
        doc.drawString(0, 0, "NMLC")
        doc.restoreState()
        
        tcr = str(r.get("tcr") if r.get("tcr") is not None else r.get("tcrPercent") or "")
        rqd = str(r.get("rqd") if r.get("rqd") is not None else r.get("rqdPercent") or "")
        
        if tcr and "%" not in tcr: tcr = f"{safe_float(tcr):.0f}"
        if rqd and "%" not in rqd: rqd = f"{safe_float(rqd):.0f}"
            
        # Draw vertically
        doc.saveState()
        doc.translate(80, y_mid - 5)
        doc.rotate(90)
        doc.drawString(0, 0, tcr)
        doc.restoreState()
        
        doc.saveState()
        doc.translate(100, y_mid - 5)
        doc.rotate(90)
        doc.drawString(0, 0, rqd)
        doc.restoreState()

def _draw_discontinuities(doc: canvas.Canvas, disconts: list[dict], page_start: float, page_end: float, depth_to_y) -> None:
    doc.setFont("Helvetica", 6.5)
    
    disconts_sorted = sorted(
        [d for d in disconts if page_start <= safe_float(d.get("depth"), 0.0) <= page_end],
        key=lambda x: safe_float(x.get("depth"), 0.0)
    )
    
    last_y = 999.0
    for d in disconts_sorted:
        d_depth = safe_float(d.get("depth"), 0.0)
        y_d = depth_to_y(d_depth)
        
        code_parts = []
        if d.get("defect_type"): code_parts.append(str(d.get("defect_type")))
        if d.get("angle") is not None: code_parts.append(f"{d.get('angle')}°")
        if d.get("shape"): code_parts.append(str(d.get("shape")))
        if d.get("roughness"): code_parts.append(str(d.get("roughness")))
        if d.get("infilling"): code_parts.append(str(d.get("infilling")))
        
        code_str = f"{d_depth:.2f}: " + " ".join(code_parts) if code_parts else f"{d_depth:.2f}"
        
        y_text = y_d - 2
        if last_y - y_text < 8:
            y_text = last_y - 8
        last_y = y_text
        
        doc.drawString(440, y_text, code_str[:40])

def _draw_footer(doc: canvas.Canvas, page_idx: int, pages_count: int) -> None:
    doc.rect(30, 30, 535, 50, fill=0, stroke=1)
    
    doc.setFont("Helvetica", 7)
    doc.drawCentredString(297, 72, "Notes: See explanation sheets for meaning of all descriptive terms and symbols")
    doc.line(30, 68, 565, 68)
    
    doc.drawString(32, 58, "D - disturbed sample")
    doc.drawString(32, 48, "U - undisturbed tube sample")
    
    doc.drawString(180, 58, "S - jar sample")
    doc.drawString(180, 48, "B - bulk sample")
    
    doc.drawString(330, 58, "WT - level of water table or free water")
    doc.drawString(330, 48, "N - Standard Penetration Test (SPT)")
    
    doc.line(480, 68, 480, 30)
    doc.setFont("Helvetica", 10)
    doc.drawCentredString(522, 45, f"Sheet {page_idx} of {pages_count}")

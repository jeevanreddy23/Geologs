# app/tools/openground_pdf_generator.py

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, PageBreak, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, Circle, Line, String

# A4 dimensions in points: 595.27 x 841.89
# Printable area: we want thin margins, say 25 points all around
MARGIN = 25
PAGE_WIDTH, PAGE_HEIGHT = A4

def draw_header_footer(canvas, doc):
    canvas.saveState()
    
    # Outer frame border
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(1)
    canvas.rect(MARGIN, MARGIN, PAGE_WIDTH - 2*MARGIN, PAGE_HEIGHT - 2*MARGIN)
    
    # ------------------ HEADER BLOCK (y from 716 to 816) ------------------
    # Header box boundaries
    header_y = PAGE_HEIGHT - MARGIN - 100
    canvas.line(MARGIN, header_y, PAGE_WIDTH - MARGIN, header_y)
    
    # Borehole Log title
    canvas.setFont("Helvetica-Bold", 16)
    canvas.drawString(MARGIN + 10, PAGE_HEIGHT - MARGIN - 25, "BOREHOLE LOG")
    
    # Subheader / standard
    canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGIN + 10, PAGE_HEIGHT - MARGIN - 40, "Standard: AS 1726:2017")
    
    # Header Grid dividers
    # Column 1 divider: x = 160
    # Column 2 divider: x = 320
    # Column 3 divider: x = 440
    canvas.line(160, PAGE_HEIGHT - MARGIN, 160, header_y)
    canvas.line(320, PAGE_HEIGHT - MARGIN, 320, header_y)
    canvas.line(440, PAGE_HEIGHT - MARGIN, 440, header_y)
    
    # Column 1: BH Metadata
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(170, PAGE_HEIGHT - MARGIN - 20, "BH ID: MPA-BH04")
    canvas.setFont("Helvetica", 8)
    canvas.drawString(170, PAGE_HEIGHT - MARGIN - 35, "Client: By Group Pty Ltd")
    canvas.drawString(170, PAGE_HEIGHT - MARGIN - 50, "Date: 20 May 2026")
    canvas.drawString(170, PAGE_HEIGHT - MARGIN - 65, "Job No: 32904/2304E-G")
    canvas.drawString(170, PAGE_HEIGHT - MARGIN - 80, "Logged: JP | Reviewed: MF")
    
    # Column 2: Location and Contractor
    canvas.drawString(330, PAGE_HEIGHT - MARGIN - 20, "Address: 105-113 Hollinsworth Rd")
    canvas.drawString(330, PAGE_HEIGHT - MARGIN - 35, "         Marsden Park")
    canvas.drawString(330, PAGE_HEIGHT - MARGIN - 55, "Drilling Co: Geosense Drilling")
    canvas.drawString(330, PAGE_HEIGHT - MARGIN - 70, "Engineers")
    canvas.drawString(330, PAGE_HEIGHT - MARGIN - 85, "Surface RL: ~40.70 m (AHD)")
    
    # Column 3: Rig and Drill Details
    canvas.drawString(450, PAGE_HEIGHT - MARGIN - 20, "Drill Bit: Auger")
    canvas.drawString(450, PAGE_HEIGHT - MARGIN - 35, "Plant: Hanjin Rig")
    canvas.drawString(450, PAGE_HEIGHT - MARGIN - 50, "Inclination: 90°")
    canvas.drawString(450, PAGE_HEIGHT - MARGIN - 65, "Hole Ø: 100 mm")
    
    # ------------------ FOOTER BLOCK (y from 25 to 85) ------------------
    footer_y = MARGIN + 60
    canvas.line(MARGIN, footer_y, PAGE_WIDTH - MARGIN, footer_y)
    
    # Page Number
    page_num = doc.page
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(PAGE_WIDTH - MARGIN - 10, MARGIN + 10, f"Sheet {page_num} of 3")
    
    # Legend & Abbreviations in Footer
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(MARGIN + 10, MARGIN + 48, "ABBREVIATIONS & NOTES:")
    canvas.setFont("Helvetica", 6.5)
    canvas.drawString(MARGIN + 10, MARGIN + 38, "D - Disturbed sample  |  U50 - Undisturbed tube sample (50mm)  |  S - Jar sample  |  B - Bulk sample")
    canvas.drawString(MARGIN + 10, MARGIN + 28, "WT - Groundwater level  |  N - Standard Penetration Test blow count (SPT)")
    canvas.drawString(MARGIN + 10, MARGIN + 18, "Weathering: XW - Extremely Weathered | HW - Highly Weathered | MW - Moderately Weathered | SW - Slightly Weathered | FR - Fresh")
    canvas.drawString(MARGIN + 10, MARGIN + 8, "Strength: VL - Very Low | L - Low | M - Medium | H - High | VH - Very High | EH - Extremely High")
    
    canvas.restoreState()

def create_graphic_log(color_hex):
    # Width of graphic log column is 25pt, height is 30pt
    d = Drawing(25, 30)
    d.add(Rect(0, 0, 25, 30, fillColor=colors.HexColor(color_hex), strokeColor=colors.grey, strokeWidth=0.5))
    return d

def create_strength_plot(strength_type, value):
    # Width of strength plot is 50pt, height is 30pt
    # Strength categories: VL, L, M, H, VH, EH
    # Map value to x coordinate (10 to 45)
    d = Drawing(50, 30)
    # Draw reference grid lines
    for x in [10, 20, 30, 40]:
        d.add(Line(x, 0, x, 30, strokeColor=colors.HexColor("#e0e0e0"), strokeWidth=0.5))
    
    d.add(String(2, 2, "VL", fontSize=5, fontName="Helvetica"))
    d.add(String(42, 2, "EH", fontSize=5, fontName="Helvetica"))
    
    # Map strength to coordinates
    x_coord = 25
    if value < 0.1:
        x_coord = 8
    elif value < 0.3:
        x_coord = 16
    elif value < 1.0:
        x_coord = 24
    elif value < 3.0:
        x_coord = 32
    elif value < 10.0:
        x_coord = 40
    else:
        x_coord = 46
        
    if strength_type == 'axial':
        # Draw solid black triangle pointing down
        d.add(Line(x_coord - 3, 18, x_coord + 3, 18, strokeColor=colors.black, strokeWidth=1))
        d.add(Line(x_coord - 3, 18, x_coord, 12, strokeColor=colors.black, strokeWidth=1))
        d.add(Line(x_coord + 3, 18, x_coord, 12, strokeColor=colors.black, strokeWidth=1))
    else:
        # Draw hollow circle
        d.add(Circle(x_coord, 15, 3, fillColor=None, strokeColor=colors.black, strokeWidth=1))
        
    d.add(String(x_coord - 5, 22, f"{value}", fontSize=5.5, fontName="Helvetica-Bold"))
    return d

def generate_openground_pdf(output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Page template setup
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN + 100,
        bottomMargin=MARGIN + 60
    )
    
    styles = getSampleStyleSheet()
    
    # Custom paragraph styles for columns
    desc_style = ParagraphStyle(
        'DescStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8.5
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.5,
        textColor=colors.white,
        alignment=1 # Center
    )
    
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        alignment=1 # Center
    )
    
    cell_bold_style = ParagraphStyle(
        'CellBoldStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        alignment=1 # Center
    )
    
    elements = []
    
    # =========================================================================
    # PAGE 1: SOIL LOG (0.0 to 5.5m)
    # =========================================================================
    col_widths_p1 = [45, 75, 40, 30, 220, 45, 45, 45] # Sum = 545
    
    table_data_p1 = [
        [
            Paragraph("GROUNDWATER<br/>LEVELS", header_style),
            Paragraph("SAMPLES &<br/>FIELD TESTS", header_style),
            Paragraph("DEPTH<br/>(m)", header_style),
            Paragraph("GRAPHIC<br/>LOG", header_style),
            Paragraph("MATERIAL DESCRIPTION", header_style),
            Paragraph("CLASS<br/>SYMBOL", header_style),
            Paragraph("CONSISTENCY<br/>/ REL. DENSITY", header_style),
            Paragraph("MOISTURE<br/>CONDITION", header_style)
        ],
        # 0.0 - 0.45m
        [
            "",
            Paragraph("0.30m: D", cell_style),
            "0.0 - 0.45",
            create_graphic_log("#d2b48c"),
            Paragraph("<b>FILL: Gravelly SAND:</b> fine to medium grained, grey brown, with angular to sub angular gravel", desc_style),
            Paragraph("SW", cell_bold_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style)
        ],
        # 0.45 - 1.20m
        [
            "",
            Paragraph("0.90m: S<br/>1.00m: SPT N=12", cell_style),
            "0.45 - 1.20",
            create_graphic_log("#deb887"),
            Paragraph("<b>Silty CLAY:</b> medium plasticity, pale brown", desc_style),
            Paragraph("CI", cell_bold_style),
            Paragraph("F to St", cell_style),
            Paragraph("M", cell_style)
        ],
        # 1.20 - 4.20m
        [
            "",
            Paragraph("2.00m: U50<br/>3.00m: SPT N=18<br/>4.00m: U50", cell_style),
            "1.20 - 4.20",
            create_graphic_log("#cd853f"),
            Paragraph("<b>Silty CLAY:</b> medium to high plasticity, pale brown grey", desc_style),
            Paragraph("CI-CH", cell_bold_style),
            Paragraph("St to VSt", cell_style),
            Paragraph("M > PL", cell_style)
        ],
        # 4.20 - 5.50m
        [
            "",
            Paragraph("5.00m: SPT N=25", cell_style),
            "4.20 - 5.50",
            create_graphic_log("#bc8f8f"),
            Paragraph("<b>SILTSTONE:</b> brown, extremely weathered", desc_style),
            Paragraph("-", cell_style),
            Paragraph("St to VSt", cell_style),
            Paragraph("M > PL", cell_style)
        ]
    ]
    
    t_p1 = Table(table_data_p1, colWidths=col_widths_p1)
    t_p1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1c2d3d")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#7f8c8d")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(t_p1)
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("<b>Log continued on next page.</b>", desc_style))
    elements.append(PageBreak())
    
    # =========================================================================
    # PAGE 2: ROCK LOG (5.50 to 10.00m)
    # =========================================================================
    col_widths_p2 = [30, 30, 25, 25, 40, 25, 30, 140, 40, 50, 75, 35] # Sum = 545
    
    table_data_p2 = [
        [
            Paragraph("METHOD", header_style),
            Paragraph("FLUSH<br/>RET", header_style),
            Paragraph("TCR<br/>%", header_style),
            Paragraph("RQD<br/>%", header_style),
            Paragraph("DEPTH<br/>(m)", header_style),
            Paragraph("GRAPHIC<br/>LOG", header_style),
            Paragraph("RL (m<br/>AHD)", header_style),
            Paragraph("MATERIAL DESCRIPTION", header_style),
            Paragraph("WEATHERING", header_style),
            Paragraph("EST. STRENGTH<br/>Is(50)", header_style),
            Paragraph("DISCONTINUITIES &<br/>ADDITIONAL DATA", header_style),
            Paragraph("FRACTURE<br/>SPACING", header_style)
        ],
        # 5.50 - 7.00m
        [
            Paragraph("NMLC", cell_style),
            Paragraph("100%", cell_style),
            Paragraph("100", cell_bold_style),
            Paragraph("47", cell_bold_style),
            "5.50 - 7.00",
            create_graphic_log("#708090"),
            "35.20",
            Paragraph("<b>SILTSTONE:</b> grey, extremely weathered to moderately weathered", desc_style),
            Paragraph("MW to HW", cell_bold_style),
            create_strength_plot('axial', 0.1),
            Paragraph("<b>5.68:</b> BP - 0° PR SM CN<br/><b>5.82-6.00:</b> BP - 0° UN RO CN<br/><b>6.00-6.66:</b> SZ<br/><b>6.66:</b> BP - 5° UN RO SN", desc_style),
            Paragraph("100 to<br/>300", cell_style)
        ],
        # 7.00 - 8.50m
        [
            Paragraph("NMLC", cell_style),
            Paragraph("100%", cell_style),
            Paragraph("100", cell_bold_style),
            Paragraph("45", cell_bold_style),
            "7.00 - 8.50",
            create_graphic_log("#b0c4de"),
            "34.70",
            Paragraph("<b>SANDSTONE:</b> grey, interbedded with shale", desc_style),
            Paragraph("MW", cell_bold_style),
            create_strength_plot('diametral', 0.3),
            Paragraph("<b>7.00-8.27:</b> DB<br/><b>8.27:</b> CS<br/><b>8.42:</b> BP - 5° PR RO SN", desc_style),
            Paragraph("300 to<br/>1000", cell_style)
        ],
        # 8.50 - 10.00m
        [
            Paragraph("NMLC", cell_style),
            Paragraph("100%", cell_style),
            Paragraph("100", cell_bold_style),
            Paragraph("45", cell_bold_style),
            "8.50 - 10.00",
            create_graphic_log("#4f4f4f"),
            "33.20",
            Paragraph("<b>SHALE:</b> grey to dark grey, laminated to thinly bedded", desc_style),
            Paragraph("MW to HW", cell_bold_style),
            create_strength_plot('axial', 1.0),
            Paragraph("<b>9.00:</b> BP - 5° PR RO SN<br/><b>9.17:</b> CS<br/><b>9.49:</b> DB", desc_style),
            Paragraph("30 to<br/>100", cell_style)
        ]
    ]
    
    t_p2 = Table(table_data_p2, colWidths=col_widths_p2)
    t_p2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1c2d3d")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#7f8c8d")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(t_p2)
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("<b>Log continued on next page.</b>", desc_style))
    elements.append(PageBreak())
    
    # =========================================================================
    # PAGE 3: ROCK LOG (10.00 to 15.74m)
    # =========================================================================
    table_data_p3 = [
        [
            Paragraph("METHOD", header_style),
            Paragraph("FLUSH<br/>RET", header_style),
            Paragraph("TCR<br/>%", header_style),
            Paragraph("RQD<br/>%", header_style),
            Paragraph("DEPTH<br/>(m)", header_style),
            Paragraph("GRAPHIC<br/>LOG", header_style),
            Paragraph("RL (m<br/>AHD)", header_style),
            Paragraph("MATERIAL DESCRIPTION", header_style),
            Paragraph("WEATHERING", header_style),
            Paragraph("EST. STRENGTH<br/>Is(50)", header_style),
            Paragraph("DISCONTINUITIES &<br/>ADDITIONAL DATA", header_style),
            Paragraph("FRACTURE<br/>SPACING", header_style)
        ],
        # 10.00 - 13.00m
        [
            Paragraph("NMLC", cell_style),
            Paragraph("100%", cell_style),
            Paragraph("100", cell_bold_style),
            Paragraph("45", cell_bold_style),
            "10.00 - 13.00",
            create_graphic_log("#4f4f4f"),
            "30.70",
            Paragraph("<b>SHALE:</b> grey to dark grey, laminated to thinly bedded", desc_style),
            Paragraph("HW to XW", cell_bold_style),
            create_strength_plot('diametral', 3.0),
            Paragraph("<b>10.00-10.05:</b> CS<br/><b>10.05:</b> BP - 10° CU RO SN<br/><b>10.62:</b> CS<br/><b>10.66:</b> BP - 0° IR RO VN<br/><b>10.90:</b> HB<br/><b>11.00-11.47:</b> DB CN<br/><b>11.47-11.71:</b> BP - 10° CU RO SN<br/><b>11.71-12.00:</b> BP - 5° CU RO SN<br/><b>12.00:</b> HB<br/><b>12.23:</b> BP - CU RO CN<br/><b>12.61:</b> HB", desc_style),
            Paragraph("30 to<br/>100", cell_style)
        ],
        # 13.00 - 15.74m
        [
            Paragraph("NMLC", cell_style),
            Paragraph("100%", cell_style),
            Paragraph("100", cell_bold_style),
            Paragraph("72", cell_bold_style),
            "13.00 - 15.74",
            create_graphic_log("#4f4f4f"),
            "24.96",
            Paragraph("<b>SHALE:</b> grey to dark grey, laminated to thinly bedded<br/><br/><b>Terminated at 15.74m. Target Depth Reached.</b>", desc_style),
            Paragraph("SW to MW", cell_bold_style),
            create_strength_plot('axial', 10.0),
            Paragraph("<b>13.00:</b> DB<br/><b>13.14:</b> SZ<br/><b>14.00:</b> DB<br/><b>14.18:</b> DB<br/><b>14.50:</b> HB<br/><b>14.79-15.00:</b> SZ<br/><b>15.00:</b> SZ<br/><b>15.30-15.48:</b> HB", desc_style),
            Paragraph("100 to<br/>300", cell_style)
        ]
    ]
    
    t_p3 = Table(table_data_p3, colWidths=col_widths_p2)
    t_p3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1c2d3d")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#7f8c8d")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(t_p3)
    
    doc.build(elements, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    return {"success": True, "path": output_path}

if __name__ == '__main__':
    generate_openground_pdf(r"C:\Users\pored\Downloads\log-MPA-BH04_generated.pdf")

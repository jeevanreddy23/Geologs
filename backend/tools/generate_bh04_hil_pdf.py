from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from textwrap import wrap

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle


PAGE_W, PAGE_H = A4
MARGIN = 14 * mm
BLUE = colors.HexColor("#1e293b")
LIGHT_GREY = colors.HexColor("#f1f5f9")
GRID = colors.HexColor("#cbd5e1")
RED = colors.HexColor("#b91c1c")
AMBER = colors.HexColor("#92400e")
GREY = colors.HexColor("#64748b")


@dataclass(frozen=True)
class Bh04Metadata:
    borehole_no: str = "BH04"
    project_no: str = "32904 / 23046G"
    client: str = "BY Group"
    address: str = "105-113 Hollingsworth Rd, Marsden Park NSW"
    logged_date: str = "2026-05-20"
    tray: str = "Tray 1 of 3"
    depth_from_m: float = 5.0
    depth_to_m: float = 15.74
    material_draft: str = "Dark grey rock, probable shale/siltstone"


def draw_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    size: int = 8,
    color=colors.black,
    bold: bool = False,
) -> None:
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, text)


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width_chars: int,
    size: int = 7,
    leading: int = 9,
) -> float:
    c.setFont("Helvetica", size)
    c.setFillColor(colors.black)
    for line in wrap(text, width_chars):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_header(c: canvas.Canvas, title: str, page_no: int) -> None:
    c.setFillColor(BLUE)
    c.rect(0, PAGE_H - 22 * mm, PAGE_W, 22 * mm, stroke=0, fill=1)
    draw_text(c, "STS GEOTECHNICS PTY LTD", MARGIN, PAGE_H - 10 * mm, 12, colors.white, True)
    draw_text(c, title, MARGIN, PAGE_H - 17 * mm, 10, colors.white, True)
    draw_text(c, "DRAFT - HUMAN REVIEW REQUIRED", PAGE_W - 84 * mm, PAGE_H - 10 * mm, 9, colors.white, True)
    draw_text(c, f"Page {page_no}", PAGE_W - 28 * mm, PAGE_H - 17 * mm, 8, colors.white)


def draw_watermark(c: canvas.Canvas) -> None:
    c.saveState()
    c.translate(PAGE_W / 2, PAGE_H / 2)
    c.rotate(35)
    c.setFillColor(colors.Color(0.75, 0.1, 0.1, alpha=0.08))
    c.setFont("Helvetica-Bold", 44)
    c.drawCentredString(0, 0, "HUMAN REVIEW REQUIRED")
    c.restoreState()


def fit_image(c: canvas.Canvas, image_path: Path, x: float, y: float, width: float, height: float) -> None:
    with Image.open(image_path) as image:
        image_width, image_height = image.size
    scale = min(width / image_width, height / image_height)
    draw_width = image_width * scale
    draw_height = image_height * scale
    c.drawImage(
        str(image_path),
        x + (width - draw_width) / 2,
        y + (height - draw_height) / 2,
        draw_width,
        draw_height,
        preserveAspectRatio=True,
        mask="auto",
    )


def draw_field_table(c: canvas.Canvas, x: float, y: float, metadata: Bh04Metadata) -> float:
    data = [
        ["Field", "Draft extraction", "Status"],
        ["Project no.", f"{metadata.project_no} (photo-board reading)", "Review"],
        ["Client", f"{metadata.client} (photo-board reading)", "Review"],
        ["Address", metadata.address, "Review"],
        ["Date", metadata.logged_date, "Review"],
        ["Borehole no.", metadata.borehole_no, "Review"],
        ["Core run", metadata.tray, "Review"],
        ["Depth interval", f"{metadata.depth_from_m:.2f} m to {metadata.depth_to_m:.2f} m", "Review"],
        ["Material", metadata.material_draft, "Engineer confirm"],
    ]
    table = Table(data, colWidths=[34 * mm, 96 * mm, 34 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.25, GRID),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (2, 1), (2, -1), colors.HexColor("#fef3c7")),
                ("TEXTCOLOR", (2, 1), (2, -1), AMBER),
            ]
        )
    )
    table.wrapOn(c, PAGE_W, PAGE_H)
    table.drawOn(c, x, y - table._height)
    return y - table._height


def rock_intervals() -> list[tuple[float, float, str, str]]:
    return [
        (5.00, 6.00, "Dark grey rock, probable SHALE/SILTSTONE; slightly to moderately weathered; medium to high strength; mostly recovered core.", "Joints/fractures visible; est. RQD 80-90%."),
        (6.00, 7.00, "Dark grey fine-grained rock; moderately weathered; broken/fractured zones evident from photo.", "Close defects; est. RQD 55-70%."),
        (7.00, 8.00, "Dark grey rock; fractured with several short core pieces and clayey/broken seams.", "Very close to close defects; est. RQD 45-65%."),
        (8.00, 9.00, "Dark grey rock; broken zone in tray, weathering/defect infill to be confirmed by engineer.", "Broken core; est. RQD 50-65%."),
        (9.00, 10.00, "Dark grey rock; mixed competent lengths and broken zones.", "Close defects; est. RQD 60-75%."),
        (10.00, 11.00, "Dark grey rock; longer intact pieces visible, local fractured zones.", "Moderate to close defects; est. RQD 70-85%."),
        (11.00, 12.00, "Dark grey rock; variable core length, fractured intervals.", "Close defects; est. RQD 55-75%."),
        (12.00, 13.00, "Dark grey rock; mostly continuous core, slightly weathered appearance.", "Moderate defects; est. RQD 75-90%."),
        (13.00, 14.00, "Dark grey rock; competent core with local broken/fractured patches.", "Moderate to close defects; est. RQD 65-80%."),
        (14.00, 15.00, "Dark grey rock; mostly continuous core with local broken zone.", "Moderate defects; est. RQD 70-85%."),
        (15.00, 15.74, "Dark grey rock; end of run at 15.74 m; final short interval.", "Fractured; est. RQD 60-75%."),
    ]


def draw_rock_log(c: canvas.Canvas, metadata: Bh04Metadata) -> None:
    draw_header(c, f"GINT-STYLE ROCK CORE LOG - MPA-{metadata.borehole_no}", 2)
    draw_watermark(c)

    meta = [
        ["Project", metadata.project_no, "Borehole", metadata.borehole_no, "Date", metadata.logged_date],
        ["Client", metadata.client, "Address", metadata.address, "Interval", f"{metadata.depth_from_m:.2f}-{metadata.depth_to_m:.2f} m"],
    ]
    table = Table(meta, colWidths=[20 * mm, 35 * mm, 20 * mm, 35 * mm, 18 * mm, 37 * mm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.3, GRID),
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTNAME", (4, 0), (4, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
            ]
        )
    )
    table.wrapOn(c, PAGE_W, PAGE_H)
    table.drawOn(c, MARGIN, PAGE_H - 45 * mm)

    top = PAGE_H - 54 * mm
    bottom = 26 * mm
    log_x = MARGIN
    depth_w = 18 * mm
    graphic_w = 18 * mm
    desc_x = log_x + depth_w + graphic_w

    c.setStrokeColor(GRID)
    c.setLineWidth(0.4)
    c.rect(log_x, bottom, PAGE_W - 2 * MARGIN, top - bottom)
    c.line(log_x + depth_w, bottom, log_x + depth_w, top)
    c.line(log_x + depth_w + graphic_w, bottom, log_x + depth_w + graphic_w, top)
    c.line(desc_x + 76 * mm, bottom, desc_x + 76 * mm, top)
    c.line(desc_x + 112 * mm, bottom, desc_x + 112 * mm, top)

    c.setFillColor(BLUE)
    c.rect(log_x, top, PAGE_W - 2 * MARGIN, 8 * mm, stroke=0, fill=1)
    draw_text(c, "Depth", log_x + 2 * mm, top + 2.5 * mm, 7, colors.white, True)
    draw_text(c, "Graphic", log_x + depth_w + 2 * mm, top + 2.5 * mm, 7, colors.white, True)
    draw_text(c, "Draft rock description", desc_x + 2 * mm, top + 2.5 * mm, 7, colors.white, True)
    draw_text(c, "Defects / RQD", desc_x + 78 * mm, top + 2.5 * mm, 7, colors.white, True)
    draw_text(c, "Review", desc_x + 114 * mm, top + 2.5 * mm, 7, colors.white, True)

    def y_for_depth(depth: float) -> float:
        usable = top - bottom
        return top - ((depth - metadata.depth_from_m) / (metadata.depth_to_m - metadata.depth_from_m)) * usable

    for metre in range(int(metadata.depth_from_m), int(metadata.depth_to_m) + 1):
        y = y_for_depth(float(metre))
        c.setStrokeColor(GRID)
        c.line(log_x, y, PAGE_W - MARGIN, y)
        draw_text(c, f"{metre:.0f}", log_x + 2 * mm, y - 2.5 * mm, 7, colors.black, True)

    hatch_colors = [colors.HexColor("#334155"), colors.HexColor("#475569")]
    for idx, (d1, d2, desc, defects) in enumerate(rock_intervals()):
        y1 = y_for_depth(d1)
        y2 = y_for_depth(d2)
        c.setFillColor(hatch_colors[idx % 2])
        c.rect(log_x + depth_w + 3 * mm, y2 + 0.5 * mm, graphic_w - 6 * mm, max(1, y1 - y2 - 1 * mm), stroke=0, fill=1)
        c.setStrokeColor(colors.white)
        for offset in range(0, int(max(2, y1 - y2)), 5):
            c.line(log_x + depth_w + 3 * mm, y2 + offset, log_x + depth_w + graphic_w - 3 * mm, y2 + offset + 4)

        text_y = y1 - 4 * mm
        draw_text(c, f"{d1:.2f}-{d2:.2f} m", desc_x + 2 * mm, text_y, 6, GREY, True)
        draw_wrapped(c, desc, desc_x + 2 * mm, text_y - 8, 70, 6, 7)
        draw_wrapped(c, defects, desc_x + 78 * mm, text_y, 30, 6, 7)
        draw_wrapped(c, "NEEDS ENGINEER REVIEW", desc_x + 114 * mm, text_y, 20, 6, 7)

    note = "NOTE: Descriptions and RQD/TCR values are photo-derived draft estimates. Confirm against core, field sheets and lab data before export."
    draw_text(c, note, MARGIN, 14 * mm, 7, RED, True)


def review_gates() -> list[str]:
    return [
        "Confirm project number, client, address, date and borehole number against field records.",
        "Confirm core box depth alignment: start 5.00 m, end 15.74 m, tray 1 of 3.",
        "Confirm rock type from hand specimen/lab evidence; current draft says probable SHALE/SILTSTONE.",
        "Measure TCR, RQD, fracture index and defect spacing from core, not only from the photo.",
        "Confirm weathering, strength and defect infill under AS 1726:2017 terms.",
        "Resolve any missing intervals before issuing GINT-style log.",
        "Engineer approval recorded before final PDF/export is used for reporting.",
    ]


def draw_review_page(c: canvas.Canvas, source_image: Path, output_pdf: Path) -> None:
    draw_header(c, "HUMAN-IN-THE-LOOP REVIEW CHECKLIST", 3)
    draw_watermark(c)

    y = PAGE_H - 38 * mm
    draw_text(c, "Mandatory review gates before final export", MARGIN, y, 11, BLUE, True)
    y -= 10 * mm
    for item in review_gates():
        y = draw_wrapped(c, f"[ ] {item}", MARGIN, y, 100, 8, 11) - 2 * mm

    y -= 5 * mm
    draw_text(c, "Reviewer sign-off", MARGIN, y, 10, BLUE, True)
    y -= 10 * mm
    sign_rows = [
        ["Reviewer", ""],
        ["Role", ""],
        ["Date", ""],
        ["Decision", "Draft requires review / Approved for final export"],
        ["Comments", ""],
    ]
    table = Table(sign_rows, colWidths=[36 * mm, 128 * mm], rowHeights=[10 * mm, 10 * mm, 10 * mm, 10 * mm, 24 * mm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.4, GRID),
                ("BACKGROUND", (0, 0), (0, -1), LIGHT_GREY),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    table.wrapOn(c, PAGE_W, PAGE_H)
    table.drawOn(c, MARGIN, y - table._height)

    y = y - table._height - 12 * mm
    draw_text(c, "Audit trail", MARGIN, y, 10, BLUE, True)
    y -= 8 * mm
    audit = [
        ["Generated", datetime.now().strftime("%Y-%m-%d %H:%M")],
        ["Source image", str(source_image)],
        ["Output PDF", str(output_pdf)],
        ["Status", "DRAFT - HUMAN REVIEW REQUIRED"],
    ]
    audit_table = Table(audit, colWidths=[36 * mm, 128 * mm])
    audit_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.3, GRID),
                ("BACKGROUND", (0, 0), (0, -1), LIGHT_GREY),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
            ]
        )
    )
    audit_table.wrapOn(c, PAGE_W, PAGE_H)
    audit_table.drawOn(c, MARGIN, y - audit_table._height)


def write_sidecar(output_pdf: Path, source_image: Path, metadata: Bh04Metadata) -> Path:
    payload = {
        "status": "draft_needs_human_review",
        "output_pdf": str(output_pdf),
        "source_image": str(source_image),
        "human_review_required": True,
        "review_gates": review_gates(),
        **asdict(metadata),
    }
    sidecar = output_pdf.with_suffix(".review.json")
    sidecar.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return sidecar


def generate_pdf(source_image: Path, output_pdf: Path, metadata: Bh04Metadata | None = None) -> Path:
    if not source_image.exists():
        raise FileNotFoundError(f"Source image not found: {source_image}")

    metadata = metadata or Bh04Metadata()
    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_pdf), pagesize=A4)
    c.setTitle(f"Draft Rock Core Log - MPA-{metadata.borehole_no}")
    c.setAuthor("AutoSoil Logger")

    draw_header(c, f"PHOTO-DERIVED DRAFT ROCK CORE LOG - MPA-{metadata.borehole_no}", 1)
    draw_watermark(c)
    y = PAGE_H - 34 * mm
    draw_text(c, "Source photo and extracted metadata", MARGIN, y, 11, BLUE, True)
    y -= 6 * mm
    y = draw_field_table(c, MARGIN, y, metadata)
    y -= 8 * mm
    draw_text(c, "Uploaded image evidence", MARGIN, y, 9, BLUE, True)
    image_y = 30 * mm
    image_height = y - image_y - 5 * mm
    fit_image(c, source_image, MARGIN, image_y, PAGE_W - 2 * MARGIN, image_height)
    draw_text(c, "Review status: DRAFT - HUMAN REVIEW REQUIRED BEFORE FINAL EXPORT", MARGIN, 18 * mm, 8, RED, True)
    c.showPage()

    draw_rock_log(c, metadata)
    c.showPage()

    draw_review_page(c, source_image, output_pdf)
    c.save()
    return write_sidecar(output_pdf, source_image, metadata)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate the BH04 human-in-the-loop GINT-style draft rock log PDF.")
    parser.add_argument("--source", required=True, type=Path, help="Core-tray source photo.")
    parser.add_argument("--output", required=True, type=Path, help="Destination PDF path, for example C:\\Users\\jporeddy\\Downloads\\New folder\\log-MPA-BH04.pdf.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sidecar = generate_pdf(args.source, args.output)
    print(json.dumps({"pdf": str(args.output), "sidecar": str(sidecar), "status": "created"}, indent=2))


if __name__ == "__main__":
    main()

import jsPDF from "jspdf";
import {
  type BoreholeEntry,
  type BoreholeProject,
  formatAS1726Description,
  formatTestResults,
  formatSPTResult,
  formatDCPResults,
} from "./as1726";

const PW = 297;
const PH = 210;
const ML = 10;
const MR = 10;
const CONTENT_W = PW - ML - MR;
const HEADER_H = 36;

const COL = {
  depth:       { x: 0,    w: 18 },
  graphic:     { x: 18,   w: 16 },
  sample:      { x: 34,   w: 14 },
  description: { x: 48,   w: 88 },
  spt:         { x: 136,  w: 28 },
  ll:          { x: 164,  w: 15 },
  pl:          { x: 179,  w: 15 },
  pi:          { x: 194,  w: 15 },
  mc:          { x: 209,  w: 15 },
  cbr:         { x: 224,  w: 15 },
  remarks:     { x: 239,  w: CONTENT_W - 239 },
};

const DARK_GREEN  = [30, 60, 40]    as [number,number,number];
const MID_GREEN   = [55, 100, 70]   as [number,number,number];
const LIGHT_GREEN = [225, 235, 230] as [number,number,number];
const RULE_GREY   = [190, 190, 190] as [number,number,number];
const TEXT_DARK   = [30, 30, 30]    as [number,number,number];
const TEXT_GREY   = [100, 100, 100] as [number,number,number];
const WHITE       = [255, 255, 255] as [number,number,number];

const BODY_TOP = HEADER_H + 20;
const BODY_BOT = PH - 14;
const BODY_H   = BODY_BOT - BODY_TOP;

function depthScale(totalDepthM: number): number {
  return BODY_H / Math.max(totalDepthM, 1);
}

function drawLithologyHatch(doc: jsPDF, soilType: string, x: number, y: number, w: number, h: number) {
  doc.setLineWidth(0.2);
  const type = soilType.toUpperCase();
  if (type === "CLAY") {
    doc.setDrawColor(140, 100, 80);
    for (let dy = 0; dy < h; dy += 1.5) doc.line(x, y + dy, x + w, y + dy);
  } else if (type === "SILT") {
    doc.setDrawColor(160, 140, 100);
    for (let dy = 0; dy < h; dy += 2) doc.line(x, y + dy, x + w, y + dy);
    for (let dy = 1; dy < h; dy += 4) doc.line(x + 1, y + dy, x + 3, y + dy);
  } else if (type === "SAND") {
    doc.setDrawColor(220, 200, 120);
    doc.setFillColor(220, 200, 120);
    for (let dy = 1.5; dy < h; dy += 2.5) {
      for (let dx = 1.5; dx < w; dx += 2.5) doc.circle(x + dx, y + dy, 0.4, "F");
    }
  } else if (type === "GRAVEL") {
    doc.setDrawColor(160, 120, 80);
    for (let dy = 0; dy < h; dy += 3) {
      for (let dx = 0; dx < w; dx += 4) doc.rect(x + dx, y + dy, 3.5, 2.5, "S");
    }
  } else if (type === "ROCK") {
    doc.setDrawColor(120, 120, 120);
    for (let dy = -w; dy < h + w; dy += 3) doc.line(x, y + dy, x + w, y + dy + w);
  } else if (type === "FILL" || type === "TOPSOIL") {
    doc.setDrawColor(170, 130, 90);
    for (let dy = 0; dy < h + w; dy += 3) {
      doc.line(x, y + dy, x + w, y + dy - w);
      doc.line(x, y + dy - w, x + w, y + dy);
    }
  } else if (type === "PEAT") {
    doc.setDrawColor(80, 60, 30);
    for (let dy = 0; dy < h; dy += 2) doc.line(x, y + dy, x + w, y + dy);
  } else {
    doc.setFillColor(230, 230, 230);
    doc.rect(x, y, w, h, "F");
  }
}

function drawPageHeader(doc: jsPDF, projectName: string, boreholeId: string, totalDepth: string, pageNum: number, totalPages: number) {
  doc.setFillColor(...DARK_GREEN);
  doc.rect(0, 0, PW, 14, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("BOREHOLE LOG", ML, 9.5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("AS 1726:2017 — Geotechnical Site Investigation", ML + 42, 9.5);
  doc.setFont("helvetica", "bold");
  doc.text("Auto-Soil Logger", PW - MR, 9.5, { align: "right" });

  const metaTop = 14;
  doc.setFillColor(...LIGHT_GREEN);
  doc.rect(0, metaTop, PW, HEADER_H - 14, "F");

  const col1 = ML, col2 = ML + 80, col3 = ML + 155, col4 = ML + 220;
  const row1 = metaTop + 6, row2 = metaTop + 13, row3 = metaTop + 19;

  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_DARK);

  const field = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", x + doc.getTextWidth(label + ": ") + 1, y);
  };

  field("Project", projectName, col1, row1);
  field("Borehole ID", boreholeId, col2, row1);
  field("Total Depth", `${totalDepth} m`, col3, row1);
  field("Date", new Date().toLocaleDateString("en-AU"), col4, row1);
  field("Client", "—", col1, row2);
  field("Location", "—", col2, row2);
  field("Driller", "—", col3, row2);
  field("Rig", "—", col4, row2);
  field("Method", "Rotary / Wash Boring", col1, row3);
  field("Casing Dia.", "—", col2, row3);
  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNum} of ${totalPages}`, PW - MR, row3, { align: "right" });

  doc.setDrawColor(...DARK_GREEN);
  doc.setLineWidth(0.5);
  doc.line(0, HEADER_H, PW, HEADER_H);
}

function drawColumnHeaders(doc: jsPDF) {
  const y = HEADER_H;
  const h = 20;
  doc.setFillColor(...MID_GREEN);
  doc.rect(0, y, PW, h, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);

  const lY = y + 7, lY2 = y + 14;
  const hdr = (l: string, col: {x:number;w:number}, sub?: string) => {
    const cx = ML + col.x + col.w / 2;
    doc.text(l, cx, lY, {align:"center"});
    if (sub) doc.text(sub, cx, lY2, {align:"center"});
  };

  hdr("DEPTH", COL.depth, "(m)");
  hdr("GRAPHIC", COL.graphic, "LOG");
  hdr("SAMPLE", COL.sample, "TYPE");
  hdr("SOIL DESCRIPTION", COL.description, "(AS 1726:2017)");
  hdr("SPT", COL.spt, "N-VALUE");
  hdr("LL", COL.ll, "(%)");
  hdr("PL", COL.pl, "(%)");
  hdr("PI", COL.pi, "(%)");
  hdr("MC", COL.mc, "(%)");
  hdr("CBR", COL.cbr, "(%)");
  hdr("REMARKS /", COL.remarks, "GRADING");

  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.3);
  [COL.graphic, COL.sample, COL.description, COL.spt,
   COL.ll, COL.pl, COL.pi, COL.mc, COL.cbr, COL.remarks].forEach(col => {
    doc.line(ML + col.x, y, ML + col.x, y + h);
  });

  doc.setDrawColor(...DARK_GREEN);
  doc.setLineWidth(0.5);
  doc.line(ML, y + h, PW - MR, y + h);
}

function drawDepthScale(doc: jsPDF, totalDepthM: number) {
  const pixPerM = depthScale(totalDepthM);
  const x = ML;
  const w = COL.depth.w;
  doc.setDrawColor(...RULE_GREY);
  for (let d = 0; d <= totalDepthM; d += 0.5) {
    const y = BODY_TOP + d * pixPerM;
    if (y > BODY_BOT) break;
    const isMajor = Number.isInteger(d);
    doc.setLineWidth(isMajor ? 0.4 : 0.15);
    doc.line(x + w - (isMajor ? 3 : 1.5), y, x + w, y);
    if (isMajor) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEXT_GREY);
      doc.text(d.toFixed(1), x + w - 5, y + 1, { align: "right" });
    }
  }
  doc.setLineWidth(0.3);
  doc.line(x + w, BODY_TOP, x + w, BODY_BOT);
  doc.line(x, BODY_TOP, x, BODY_BOT);
}

function drawLayer(doc: jsPDF, entry: BoreholeEntry, totalDepthM: number, index: number) {
  const pixPerM = depthScale(totalDepthM);
  const from = parseFloat(entry.depthFrom) || 0;
  const to   = parseFloat(entry.depthTo)   || from + 0.5;
  const yTop = BODY_TOP + from * pixPerM;
  const yBot = BODY_TOP + to   * pixPerM;
  const h    = Math.max(yBot - yTop, 4);

  if (index % 2 === 0) {
    doc.setFillColor(248, 250, 248);
    doc.rect(ML + COL.description.x, yTop, CONTENT_W - COL.description.x, h, "F");
  }

  // Graphic
  const gx = ML + COL.graphic.x, gw = COL.graphic.w;
  doc.setFillColor(...WHITE);
  doc.rect(gx, yTop, gw, h, "F");
  drawLithologyHatch(doc, entry.primarySoilType, gx, yTop, gw, h);
  doc.setDrawColor(...RULE_GREY);
  doc.setLineWidth(0.15);
  doc.rect(gx, yTop, gw, h, "S");

  // Depth label at base
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_GREY);
  doc.text(`${to.toFixed(1)}`, ML + COL.depth.w - 2, yBot + 1, { align: "right" });

  // Sample box
  if (entry.sptResult) {
    const sx = ML + COL.sample.x, sw = COL.sample.w;
    const cy = yTop + h / 2;
    doc.setFillColor(...MID_GREEN);
    doc.roundedRect(sx + 1, cy - 3, sw - 2, 6, 1, 1, "F");
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    const n1 = entry.sptResult.n1 || "0";
    const n2 = entry.sptResult.n2 || "0";
    const n3 = entry.sptResult.n3 || "0";
    doc.text(`SS ${n1}/${n2}/${n3}`, sx + sw / 2, cy + 1.5, { align: "center" });
  }

  // SPT bar chart
  if (entry.sptResult) {
    const n2 = parseInt(entry.sptResult.n2) || 0;
    const n3 = parseInt(entry.sptResult.n3) || 0;
    const nVal = n2 + n3;
    const barX = ML + COL.spt.x, barMaxW = COL.spt.w - 4;
    const barH = Math.min(h * 0.45, 5);
    const barW = Math.min((nVal / 60) * barMaxW, barMaxW);
    const barY = yTop + h / 2 - barH / 2;
    doc.setFillColor(220, 230, 225);
    doc.rect(barX + 2, barY, barMaxW, barH, "F");
    if (barW > 0) { doc.setFillColor(...MID_GREEN); doc.rect(barX + 2, barY, barW, barH, "F"); }
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_DARK);
    doc.text(`N=${nVal}`, barX + 2, barY + barH + 3.5);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_GREY);
    doc.text(`${n2}/${n3}`, barX + 2, barY + barH + 6.5);
  }

  // Description text
  const dx = ML + COL.description.x + 2, dw = COL.description.w - 4;
  const description = formatAS1726Description(entry);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...TEXT_GREY);
  doc.text(`${entry.depthFrom}m – ${entry.depthTo}m`, dx, yTop + 3);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text((entry.primarySoilType || "—").toUpperCase(), dx, yTop + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(40, 40, 40);
  const descLines = doc.splitTextToSize(description, dw);
  const maxLines = Math.max(Math.floor((h - 10) / 3.8), 1);
  doc.text(descLines.slice(0, maxLines), dx, yTop + 11);

  // Lab values
  const midY = yTop + h / 2 + 1.5;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);
  const numCell = (val: string, col: {x:number;w:number}) => {
    doc.text(val || "—", ML + col.x + col.w / 2, midY, { align: "center" });
  };
  numCell(entry.liquidLimit, COL.ll);
  numCell(entry.plasticLimit, COL.pl);
  numCell(entry.plasticityIndex, COL.pi);
  numCell(entry.moistureContent, COL.mc);
  numCell(entry.cbrValue, COL.cbr);

  // Remarks
  const rx = ML + COL.remarks.x + 1, rw = COL.remarks.w - 2;
  const testResults = formatTestResults(entry);
  const remarkParts = [...testResults];
  if (entry.gradingSummary) remarkParts.push("Grading: " + entry.gradingSummary);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const visRemarks = doc.splitTextToSize(remarkParts.join(" | "), rw);
  doc.text(visRemarks.slice(0, Math.max(Math.floor(h / 3.5), 1)), rx, yTop + 6);

  // Row divider
  doc.setDrawColor(...RULE_GREY);
  doc.setLineWidth(0.2);
  doc.line(ML, yBot, PW - MR, yBot);
}

function drawBodyColumnLines(doc: jsPDF) {
  doc.setDrawColor(...RULE_GREY);
  doc.setLineWidth(0.2);
  [COL.graphic, COL.sample, COL.description, COL.spt,
   COL.ll, COL.pl, COL.pi, COL.mc, COL.cbr, COL.remarks].forEach(col => {
    doc.line(ML + col.x, BODY_TOP, ML + col.x, BODY_BOT);
  });
  const rightEdge = ML + COL.remarks.x + COL.remarks.w;
  doc.line(rightEdge, BODY_TOP, rightEdge, BODY_BOT);
  doc.line(ML, BODY_TOP, ML, BODY_BOT);
  doc.setDrawColor(...DARK_GREEN);
  doc.setLineWidth(0.4);
  doc.line(ML, BODY_TOP, rightEdge, BODY_TOP);
  doc.line(ML, BODY_BOT, rightEdge, BODY_BOT);
}

function drawSPTScale(doc: jsPDF) {
  const barX = ML + COL.spt.x;
  const barMaxW = COL.spt.w - 4;
  [10, 20, 30, 40, 50].forEach(n => {
    const tx = barX + 2 + (n / 60) * barMaxW;
    if (tx > barX + COL.spt.w - 2) return;
    doc.setDrawColor(...RULE_GREY);
    doc.setLineWidth(0.1);
    doc.line(tx, BODY_TOP - 2, tx, BODY_TOP);
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_GREY);
    doc.text(`${n}`, tx, BODY_TOP - 3, { align: "center" });
  });
}

function drawFooter(doc: jsPDF, totalPages: number) {
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(...TEXT_GREY);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Generated by Auto-Soil Logger  |  AS 1726:2017 Geotechnical Site Investigation  |  CONFIDENTIAL",
      PW / 2, PH - 5, { align: "center" }
    );
    doc.setDrawColor(...RULE_GREY);
    doc.setLineWidth(0.2);
    doc.line(ML, PH - 9, PW - MR, PH - 9);
  }
}

export function generateBoreholeLogPDF(
  entries: BoreholeEntry[],
  projectName: string,
  boreholeId: string,
  project?: BoreholeProject
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const totalDepthM = parseFloat(project?.totalDepth || "15") || 15;
  const totalPages = doc.getNumberOfPages();

  drawPageHeader(doc, projectName, boreholeId, project?.totalDepth || "—", 1, 1);
  drawColumnHeaders(doc);
  drawDepthScale(doc, totalDepthM);
  drawBodyColumnLines(doc);
  drawSPTScale(doc);

  entries.forEach((entry, i) => drawLayer(doc, entry, totalDepthM, i));

  if (project) {
    const sptStr = formatSPTResult(project as any);
    const dcpStr = formatDCPResults(project as any);
    if (sptStr || dcpStr) {
      const noteX = ML + COL.description.x;
      const noteY = BODY_BOT + 5;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEXT_DARK);
      doc.text("IN-SITU TESTING NOTES:", noteX, noteY);
      doc.setFont("helvetica", "normal");
      if (sptStr) doc.text(sptStr, noteX, noteY + 4);
      if (dcpStr) doc.text(doc.splitTextToSize(dcpStr, 180), noteX, noteY + (sptStr ? 8 : 4));
    }
  }

  drawFooter(doc, doc.getNumberOfPages());
  doc.save(`${projectName || "borehole"}_${boreholeId || "log"}_TabLog.pdf`);
}

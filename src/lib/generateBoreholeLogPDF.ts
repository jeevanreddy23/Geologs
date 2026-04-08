import jsPDF from "jspdf";
import {
  type BoreholeEntry,
  type BoreholeProject,
  type SPTTest,
  formatAS1726Description,
  formatTestResults,
  formatDCPResults,
} from "./as1726";

// ── Page constants (Portrait A4) ──
const PW = 210;
const PH = 297;
const ML = 10;
const MR = 10;
const MT = 8;
const MB = 10;
const CONTENT_W = PW - ML - MR;

// ── gINT-style colour palette ──
const C = {
  headerBg:   [25, 35, 60]    as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  metaBg:     [245, 247, 250] as [number, number, number],
  colHdrBg:   [35, 55, 90]    as [number, number, number],
  colHdrText: [255, 255, 255] as [number, number, number],
  border:     [60, 60, 60]    as [number, number, number],
  gridLight:  [200, 200, 200] as [number, number, number],
  gridFaint:  [230, 230, 230] as [number, number, number],
  text:       [20, 20, 20]    as [number, number, number],
  textGrey:   [90, 90, 90]    as [number, number, number],
  textLight:  [140, 140, 140] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
  sptLine:    [30, 90, 180]   as [number, number, number],
  sptDot:     [30, 90, 180]   as [number, number, number],
  sptRefusal: [180, 40, 40]   as [number, number, number],
  layerDiv:   [100, 100, 100] as [number, number, number],
  rowAlt:     [250, 252, 255] as [number, number, number],
};

// ── Column layout — gINT Portrait ──
const COL = {
  depth:       { x: 0,    w: 12 },
  rl:          { x: 12,   w: 12 },  // New: Reduced Level
  graphic:     { x: 24,   w: 14 },
  sample:      { x: 38,   w: 10 },
  description: { x: 48,   w: 75 },  
  plasticity:  { x: 123,  w: 10 },
  ll:          { x: 133,  w: 8 },
  pl:          { x: 141,  w: 8 },
  pi:          { x: 149,  w: 8 },
  mc:          { x: 157,  w: 8 },
  remarks:     { x: 165,  w: 25 },
} as const;

const HEADER_H = 34;
const COL_HDR_H = 14;
const BODY_TOP = MT + HEADER_H + COL_HDR_H;
const BODY_BOT = PH - 10;
const BODY_H = BODY_BOT - BODY_TOP;

function pxPerM(totalDepthM: number): number {
  return BODY_H / Math.max(totalDepthM, 1);
}

// ══════════════════════════════════════
//  USCS Hatching — gINT standard symbols
// ══════════════════════════════════════
function drawHatch(doc: jsPDF, soilType: string, x: number, y: number, w: number, h: number) {
  doc.saveGraphicsState();
  // Clip to cell
  doc.rect(x, y, w, h);
  doc.clip();
  doc.discardPath();

  doc.setLineWidth(0.18);
  const t = soilType.toUpperCase();

  if (t === "CLAY") {
    // Horizontal dashes
    doc.setDrawColor(100, 80, 60);
    for (let dy = 1; dy < h; dy += 2) {
      for (let dx = 0; dx < w; dx += 5) {
        doc.line(x + dx, y + dy, x + dx + 3.5, y + dy);
      }
    }
  } else if (t === "SILT") {
    doc.setDrawColor(130, 110, 80);
    for (let dy = 1.5; dy < h; dy += 3) {
      doc.line(x, y + dy, x + w, y + dy);
    }
    for (let dy = 3; dy < h; dy += 6) {
      for (let dx = 1; dx < w; dx += 4) {
        doc.line(x + dx, y + dy, x + dx + 1.5, y + dy);
      }
    }
  } else if (t === "SAND") {
    // Dense stipple dots — gINT standard
    doc.setFillColor(180, 160, 100);
    const sp = 1.8;
    for (let dy = sp; dy < h; dy += sp) {
      const offset = (Math.floor(dy / sp) % 2) * (sp / 2);
      for (let dx = offset + sp / 2; dx < w; dx += sp) {
        doc.circle(x + dx, y + dy, 0.3, "F");
      }
    }
  } else if (t === "GRAVEL") {
    doc.setDrawColor(130, 100, 70);
    doc.setFillColor(130, 100, 70);
    for (let dy = 1; dy < h; dy += 4) {
      for (let dx = 1; dx < w; dx += 5) {
        doc.ellipse(x + dx + 1.5, y + dy + 1, 1.8, 1, "S");
      }
    }
  } else if (t === "ROCK") {
    doc.setDrawColor(90, 90, 90);
    doc.setLineWidth(0.25);
    for (let dy = -w; dy < h + w; dy += 4) {
      doc.line(x, y + dy, x + w, y + dy + w);
    }
    for (let dy = 0; dy < h; dy += 4) {
      doc.line(x, y + dy, x + w, y + dy);
    }
  } else if (t === "FILL" || t === "TOPSOIL") {
    doc.setDrawColor(140, 110, 70);
    for (let dy = 0; dy < h + w; dy += 3.5) {
      doc.line(x, y + dy, x + w, y + dy - w);
    }
    doc.setFillColor(140, 110, 70);
    for (let dy = 2; dy < h; dy += 5) {
      for (let dx = 2; dx < w; dx += 5) {
        doc.circle(x + dx, y + dy, 0.25, "F");
      }
    }
  } else if (t === "ROAD BASE") {
    // Crushed rock: cross-hatch with angular fragments
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.15);
    for (let dy = 0; dy < h + w; dy += 3) {
      doc.line(x, y + dy, x + w, y + dy - w);
      doc.line(x, y + dy - w, x + w, y + dy);
    }
    doc.setFillColor(80, 80, 80);
    for (let dy = 1.5; dy < h; dy += 4) {
      for (let dx = 1.5; dx < w; dx += 4) {
        doc.triangle(x + dx, y + dy - 0.8, x + dx + 1, y + dy + 0.8, x + dx - 0.8, y + dy + 0.5, "F");
      }
    }
  } else if (t === "COBBLES" || t === "BOULDERS") {
    doc.setDrawColor(110, 110, 110);
    for (let dy = 2; dy < h; dy += 5) {
      for (let dx = 2; dx < w; dx += 6) {
        doc.ellipse(x + dx + 2, y + dy + 1.5, 2.5, 1.5, "S");
      }
    }
  } else if (t === "PEAT") {
    doc.setDrawColor(60, 40, 20);
    for (let dy = 0; dy < h; dy += 1.8) {
      doc.line(x, y + dy, x + w, y + dy);
    }
  } else {
    doc.setFillColor(235, 235, 235);
    doc.rect(x, y, w, h, "F");
  }

  doc.restoreGraphicsState();
}

// ══════════════════════════════════════
//  Page Header — gINT professional
// ══════════════════════════════════════
// ── Page Header — gINT professional ──
function drawHeader(doc: jsPDF, project: BoreholeProject, pageNum: number, totalPages: number) {
  const y0 = MT;

  // Title bar
  doc.setFillColor(...C.headerBg);
  doc.rect(ML, y0, CONTENT_W, 10, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.headerText);
  doc.text("BOREHOLE LOG", ML + 3, y0 + 7);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("AS 1726:2017 \u2014 Geotechnical Site Investigation", ML + CONTENT_W / 2, y0 + 7, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("www.geologs.com.au", ML + CONTENT_W - 3, y0 + 7, { align: "right" });

  // Meta fields box
  const mY = y0 + 10;
  const mH = 24; 
  doc.setFillColor(...C.metaBg);
  doc.rect(ML, mY, CONTENT_W, mH, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.rect(ML, mY, CONTENT_W, mH, "S");

  const c1 = ML + 2, c2 = ML + 50, c3 = ML + 95, c4 = ML + 140;
  const r1 = mY + 5, r2 = mY + 11, r3 = mY + 17, r4 = mY + 22;
  doc.setFontSize(6);
  doc.setTextColor(...C.text);

  const field = (label: string, value?: string, fx: number, fy: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", fx, fy);
    const lw = doc.getTextWidth(label + ": ");
    doc.setFont("helvetica", "normal");
    doc.text(value || "\u2014", fx + lw + 1, fy);
  };

  field("Client", project.client, c1, r1);
  field("Project", project.projectName, c1, r2);
  field("Location", project.location, c1, r3);
  
  field("Borehole ID", project.boreholeId, c2, r1);
  field("Job No.", project.jobNo, c2, r2);
  field("Ground RL", project.groundLevel ? `${project.groundLevel} m` : "\u2014", c2, r3);

  field("Easting", project.eastings, c3, r1);
  field("Northing", project.northings, c3, r2);
  field("Total Depth", `${project.totalDepth} m`, c3, r3);

  field("Driller", project.driller, c4, r1);
  field("Rig", project.drillRig, c4, r2);
  field("Date", new Date().toLocaleDateString("en-AU"), c4, r3);

  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNum} of ${totalPages}`, ML + CONTENT_W - 3, r4, { align: "right" });

  if (project.groundwaterDepth) {
     doc.setFont("helvetica", "bold");
     doc.text(`Water Level: ${project.groundwaterDepth} m`, c1, r4);
  }
}

function drawWaterLevel(doc: jsPDF, depth: number, totalDepthM: number) {
  const scale = pxPerM(totalDepthM);
  const y = BODY_TOP + depth * scale;
  if (y > BODY_BOT) return;

  const symbolX = ML + COL.depth.w + 1;
  doc.setDrawColor(30, 100, 200);
  doc.setFillColor(30, 100, 200);
  doc.setLineWidth(0.2);
  
  doc.triangle(symbolX, y, symbolX + 2.5, y, symbolX + 1.25, y + 2.5, "FD");
  doc.setLineWidth(0.1);
  doc.line(symbolX - 1, y, symbolX + 3.5, y);
}

// ══════════════════════════════════════
//  Column Headers — gINT compact
// ══════════════════════════════════════
// ── Column Headers — gINT compact ──
function drawColHeaders(doc: jsPDF) {
  const y = MT + HEADER_H;
  const h = COL_HDR_H;

  doc.setFillColor(...C.colHdrBg);
  doc.rect(ML, y, CONTENT_W, h, "F");

  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.colHdrText);

  const hdr = (lines: string[], col: { x: number; w: number }) => {
    const cx = ML + col.x + col.w / 2;
    if (lines.length === 1) {
      doc.text(lines[0], cx, y + h / 2 + 1.5, { align: "center" });
    } else {
      doc.text(lines[0], cx, y + 5, { align: "center" });
      doc.text(lines[1], cx, y + 10, { align: "center" });
    }
  };

  hdr(["DEPTH", "(m)"], COL.depth);
  hdr(["R.L.", "(m)"], COL.rl);
  hdr(["GRAPHIC", "LOG"], COL.graphic);
  hdr(["SAM.", "TYP."], COL.sample);
  hdr(["MATERIAL DESCRIPTION", "AS 1726-2017"], COL.description);
  hdr(["PLS."], COL.plasticity);
  hdr(["LL", "%"], COL.ll);
  hdr(["PL", "%"], COL.pl);
  hdr(["PI", "%"], COL.pi);
  hdr(["MC", "%"], COL.mc);
  hdr(["REMARKS / GRADING", "IN-SITU TESTS"], COL.remarks);

  // Vertical separators in header
  doc.setDrawColor(...C.colHdrText);
  doc.setLineWidth(0.1);
  const allCols = [COL.rl, COL.graphic, COL.sample, COL.description, COL.plasticity,
    COL.ll, COL.pl, COL.pi, COL.mc, COL.remarks];
  allCols.forEach(col => {
    doc.line(ML + col.x, y, ML + col.x, y + h);
  });
}

// ── Depth Scale — gINT ruler ──
function drawDepthRuler(doc: jsPDF, totalDepthM: number, groundLevel?: string) {
  const scale = pxPerM(totalDepthM);
  const x = ML;
  const w = COL.depth.w;
  const rlW = COL.rl.w;
  const gl = parseFloat(groundLevel || "0") || 0;

  // Background
  doc.setFillColor(...C.white);
  doc.rect(x, BODY_TOP, w + rlW, BODY_H, "F");

  doc.setDrawColor(...C.gridLight);
  for (let d = 0; d <= totalDepthM; d += 0.5) {
    const dy = BODY_TOP + d * scale;
    if (dy > BODY_BOT) break;
    const isMajor = d % 1 === 0;

    if (isMajor) {
      doc.setLineWidth(0.3);
      doc.line(x + w + rlW - 4, dy, x + w + rlW, dy);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.text);
      doc.text(d.toFixed(1), x + w - 1, dy + 1.5, { align: "right" });
      
      // RL value
      if (groundLevel) {
        doc.setFont("helvetica", "normal");
        doc.text((gl - d).toFixed(1), x + w + rlW - 1, dy + 1.5, { align: "right" });
      }
    } else {
      doc.setLineWidth(0.15);
      doc.line(x + w + rlW - 2, dy, x + w + rlW, dy);
    }

    if (isMajor && d > 0) {
      doc.setDrawColor(...C.gridFaint);
      doc.setLineWidth(0.08);
      doc.line(ML + COL.graphic.x, dy, ML + COL.remarks.x + COL.remarks.w, dy);
      doc.setDrawColor(...C.gridLight);
    }
  }
}

// ── Body Column Lines ──
function drawBodyGrid(doc: jsPDF) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.rect(ML, BODY_TOP, CONTENT_W, BODY_H, "S");

  doc.setDrawColor(...C.gridLight);
  doc.setLineWidth(0.2);
  const allCols = [COL.rl, COL.graphic, COL.sample, COL.description, COL.plasticity,
    COL.ll, COL.pl, COL.pi, COL.mc, COL.remarks];
  allCols.forEach(col => {
    doc.line(ML + col.x, BODY_TOP, ML + col.x, BODY_BOT);
  });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.35);
  doc.line(ML + COL.description.x, BODY_TOP, ML + COL.description.x, BODY_BOT);
}

// ══════════════════════════════════════
//  Layer Row — gINT material description
// ══════════════════════════════════════
// ── Layer Row — gINT material description ──
function drawLayerRow(doc: jsPDF, entry: BoreholeEntry, totalDepthM: number, idx: number, groundLevel?: string) {
  const scale = pxPerM(totalDepthM);
  const from = parseFloat(entry.depthFrom) || 0;
  const to = parseFloat(entry.depthTo) || from + 0.5;
  const yTop = BODY_TOP + from * scale;
  const yBot = BODY_TOP + to * scale;
  const h = Math.max(yBot - yTop, 6);
  const gl = parseFloat(groundLevel || "0") || 0;

  // Alternating subtle row background
  if (idx % 2 === 0) {
    doc.setFillColor(...C.rowAlt);
    doc.rect(ML + COL.description.x, yTop, COL.remarks.x + COL.remarks.w - COL.description.x, h, "F");
  }

  // ── Graphic Log ──
  const gx = ML + COL.graphic.x, gw = COL.graphic.w;
  doc.setFillColor(...C.white);
  doc.rect(gx, yTop, gw, h, "F");
  drawHatch(doc, entry.primarySoilType, gx, yTop, gw, h);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.15);
  doc.rect(gx, yTop, gw, h, "S");

  // ── Depth labels ──
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.textGrey);
  if (from > 0) {
    doc.text(from.toFixed(2), ML + COL.depth.w - 1, yTop + 2, { align: "right" });
    if (groundLevel) {
       doc.text((gl - from).toFixed(2), ML + COL.rl.x + COL.rl.w - 1, yTop + 2, { align: "right" });
    }
  }

  // ── Sample column ──
  if (entry.sptResult && (entry.sptResult.n1 || entry.sptResult.n2 || entry.sptResult.n3)) {
    const sx = ML + COL.sample.x + 1;
    const sw = COL.sample.w - 2;
    const cy = yTop + Math.min(h / 2, 8);
    doc.setFillColor(...C.colHdrBg);
    doc.roundedRect(sx, cy - 3, sw, 6, 0.5, 0.5, "F");
    doc.setFontSize(4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text("SPT", sx + sw / 2, cy + 1, { align: "center" });
  }

  // ── Material Description ──
  const dx = ML + COL.description.x + 1.5;
  const dw = COL.description.w - 3;
  
  const descBlock = formatAS1726Description(entry);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.text);

  const descLines = doc.splitTextToSize(descBlock, dw);
  const lineH = 2.8;
  const startY = yTop + 3.5;

  descLines.forEach((line: string, li: number) => {
    if (startY + li * lineH < yBot - 1) {
      doc.text(line, dx, startY + li * lineH);
    }
  });

  // ── Plasticity/Lab columns ──
  const midY = yTop + h / 2 + 1;
  doc.setFontSize(5.5);
  const cell = (val: string, col: { x: number; w: number }) => {
    doc.text(val || "\u2014", ML + col.x + col.w / 2, midY, { align: "center" });
  };
  
  cell(entry.plasticity?.charAt(0).toUpperCase() || "", COL.plasticity);
  cell(entry.liquidLimit, COL.ll);
  cell(entry.plasticLimit, COL.pl);
  cell(entry.plasticityIndex, COL.pi);
  cell(entry.moistureContent, COL.mc);

  // ── Remarks / Tests ──
  const rx = ML + COL.remarks.x + 1;
  const rw = COL.remarks.w - 2;
  const tests = formatTestResults(entry).join(", ");
  
  doc.setFontSize(4.5);
  doc.setTextColor(...C.textGrey);
  const testLines = doc.splitTextToSize(tests, rw);
  testLines.forEach((line: string, li: number) => {
    if (yTop + 3.5 + li * 2.5 < yBot) {
      doc.text(line, rx, yTop + 3.5 + li * 2.5);
    }
  });

  // ── Layer divider ──
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(ML, yBot, ML + CONTENT_W, yBot);
}

// ══════════════════════════════════════
//  SPT N-Value Graph — gINT right column
// ══════════════════════════════════════
function drawSPTGraph(doc: jsPDF, entries: BoreholeEntry[], totalDepthM: number, sptTests?: SPTTest[]) {
  const scale = pxPerM(totalDepthM);
  const graphX = ML + COL.sptGraph.x;
  const graphW = COL.sptGraph.w;
  const maxN = 60;
  const padL = 3;
  const padR = 2;
  const plotW = graphW - padL - padR;

  // Background
  doc.setFillColor(252, 253, 255);
  doc.rect(graphX, BODY_TOP, graphW, BODY_H, "F");

  // Vertical grid lines for N=10,20,...,60
  doc.setDrawColor(215, 220, 230);
  doc.setLineWidth(0.12);
  for (const n of [10, 20, 30, 40, 50, 60]) {
    const nx = graphX + padL + (n / maxN) * plotW;
    doc.line(nx, BODY_TOP, nx, BODY_BOT);
  }

  // X-axis labels at top
  doc.setFontSize(4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.textLight);
  for (const n of [0, 10, 20, 30, 40, 50, 60]) {
    const nx = graphX + padL + (n / maxN) * plotW;
    doc.text(`${n}`, nx, BODY_TOP - 0.5, { align: "center" });
  }
  doc.setFontSize(3.5);
  doc.setFont("helvetica", "bold");
  doc.text("SPT N-Value", graphX + graphW / 2, BODY_TOP - 3, { align: "center" });

  // Horizontal depth grid lines every 1.5m (SPT intervals)
  doc.setDrawColor(230, 233, 240);
  doc.setLineWidth(0.08);
  for (let d = 1.5; d <= totalDepthM; d += 1.5) {
    const gy = BODY_TOP + d * scale;
    if (gy < BODY_BOT) {
      doc.line(graphX, gy, graphX + graphW, gy);
      // Depth tick label
      doc.setFontSize(3.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.textLight);
      doc.text(d.toFixed(1), graphX + 1, gy - 0.3);
    }
  }

  // Collect SPT points
  const sptPoints: { depth: number; nVal: number; refusal: boolean; n1: string; n2: string; n3: string }[] = [];

  if (sptTests && sptTests.length > 0) {
    sptTests.forEach(test => {
      const n2 = parseInt(test.n2) || 0;
      const n3 = parseInt(test.n3) || 0;
      const nVal = n2 + n3;
      if (nVal <= 0) return;
      sptPoints.push({
        depth: test.depth, nVal: Math.min(nVal, maxN), refusal: nVal >= 50,
        n1: test.n1, n2: test.n2, n3: test.n3
      });
    });
  } else {
    entries.forEach(entry => {
      if (!entry.sptResult) return;
      const n2 = parseInt(entry.sptResult.n2) || 0;
      const n3 = parseInt(entry.sptResult.n3) || 0;
      const nVal = n2 + n3;
      if (nVal <= 0) return;
      const depth = ((parseFloat(entry.depthFrom) || 0) + (parseFloat(entry.depthTo) || 0)) / 2;
      sptPoints.push({
        depth, nVal: Math.min(nVal, maxN), refusal: nVal >= 50,
        n1: entry.sptResult.n1, n2: entry.sptResult.n2, n3: entry.sptResult.n3
      });
    });
  }

  if (sptPoints.length === 0) {
    doc.setFontSize(5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.textLight);
    doc.text("No SPT data entered", graphX + graphW / 2, BODY_TOP + BODY_H / 2, { align: "center" });
    return;
  }

  sptPoints.sort((a, b) => a.depth - b.depth);

  // Connected line
  if (sptPoints.length > 1) {
    doc.setDrawColor(...C.sptLine);
    doc.setLineWidth(0.7);
    for (let i = 1; i < sptPoints.length; i++) {
      const p1 = sptPoints[i - 1];
      const p2 = sptPoints[i];
      doc.line(
        graphX + padL + (p1.nVal / maxN) * plotW,
        BODY_TOP + p1.depth * scale,
        graphX + padL + (p2.nVal / maxN) * plotW,
        BODY_TOP + p2.depth * scale
      );
    }
  }

  // Data points and labels
  sptPoints.forEach(pt => {
    const px = graphX + padL + (pt.nVal / maxN) * plotW;
    const py = BODY_TOP + pt.depth * scale;

    if (pt.refusal) {
      // Red square marker with "R"
      doc.setFillColor(...C.sptRefusal);
      doc.rect(px - 1.5, py - 1.5, 3, 3, "F");
      doc.setFontSize(3.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.sptRefusal);
      doc.text("R", px + 3, py + 0.5);
    } else {
      // Filled circle
      doc.setFillColor(...C.sptDot);
      doc.circle(px, py, 1.3, "F");
    }

    // N-value label
    doc.setFontSize(4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.text);
    doc.text(`${pt.nVal}`, px + 3, py + (pt.refusal ? -2 : 0.8));
  });

  // Legend
  const legY = BODY_BOT + 2.5;
  doc.setFontSize(3.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.textGrey);
  doc.setFillColor(...C.sptDot);
  doc.circle(graphX + 3, legY - 0.3, 0.7, "F");
  doc.text("N-value", graphX + 5, legY);
  doc.setFillColor(...C.sptRefusal);
  doc.rect(graphX + 17, legY - 1, 1.4, 1.4, "F");
  doc.text("Refusal (N>=50)", graphX + 20, legY);
}

// ══════════════════════════════════════
//  Footer
// ══════════════════════════════════════
function drawFooter(doc: jsPDF, totalPages: number) {
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.gridLight);
    doc.setLineWidth(0.2);
    doc.line(ML, PH - 7, ML + CONTENT_W, PH - 7);
    doc.setFontSize(5);
    doc.setTextColor(...C.textLight);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Generated by GeoLogs.com.au  |  AS 1726:2017 Geotechnical Site Investigation  |  CONFIDENTIAL",
      PW / 2, PH - 4, { align: "center" }
    );
  }
}

// ══════════════════════════════════════
//  Main Export
// ══════════════════════════════════════
// ── Main Export — gINT Portrait Clone ──
export function generateBoreholeLogPDF(
  entries: BoreholeEntry[],
  projectName: string,
  boreholeId: string,
  project?: BoreholeProject
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const totalDepthM = parseFloat(project?.totalDepth || "10") || 10;
  const gl = project?.groundLevel || "0";

  // Initial Page
  drawHeader(doc, project || { projectName, boreholeId, totalDepth: "10", layers: [] } as any, 1, 1);
  drawColHeaders(doc);
  drawDepthRuler(doc, totalDepthM, gl);
  drawBodyGrid(doc);

  // Layers
  entries.forEach((entry, i) => drawLayerRow(doc, entry, totalDepthM, i, gl));

  // Groundwater symbol
  if (project?.groundwaterDepth) {
     const dw = parseFloat(project.groundwaterDepth);
     if (!isNaN(dw)) drawWaterLevel(doc, dw, totalDepthM);
  }

  // Footer branding
  drawFooter(doc, 1);

  // Note: For deep boreholes (>15m in portrait), we would implement 
  // page splitting here. For now, we fit as much as possible on A4.

  doc.save(`${projectName || "borehole"}_${boreholeId || "log"}_gINT.pdf`);
}

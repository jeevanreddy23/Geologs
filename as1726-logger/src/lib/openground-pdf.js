/*
 * openground-pdf.js
 * -----------------
 * Browser/Node renderable @react-pdf/renderer document that reproduces the
 * Bentley OpenGround / STS Geotechnics AS1726 borehole-log layout used by the
 * Python backend (backend/app/utils/rock_pdf.py). The numeric layout constants
 * are a 1:1 port of that generator so the in-browser live preview matches the
 * server-side PDF export exactly.
 *
 * Written in plain JS (React.createElement, no JSX) so it can be imported both
 * by the Vite/TanStack app (dynamically, client-only) and by a Node script for
 * visual verification.
 *
 * Coordinate note: reportlab uses a bottom-left origin; @react-pdf <Svg> uses a
 * top-left origin. We render one full-page <Svg> per page and flip Y with
 * Y(y) = PAGE_H - y, keeping every constant identical to the reference.
 */
import { createElement as h } from 'react'
import {
  Document,
  Page,
  Svg,
  Line,
  Rect,
  Text,
  Circle,
} from '@react-pdf/renderer'

const PAGE_W = 595
const PAGE_H = 842
const Y = (y) => PAGE_H - y

const BLACK = '#000000'
const GRAY = '#808080'
const LIGHTGREY = '#d3d3d3'
const STS_GREEN = '#2f7d45'

let _k = 0
const key = () => `e${_k++}`

// ---- low-level drawing helpers (mirror reportlab canvas calls) ----
function line(out, x1, y1, x2, y2, { color = BLACK, width = 0.75 } = {}) {
  out.push(
    h(Line, {
      key: key(),
      x1,
      y1: Y(y1),
      x2,
      y2: Y(y2),
      strokeWidth: width,
      stroke: color,
    }),
  )
}

function rect(out, x, y, w, hgt, { color = BLACK, width = 0.75, fill = 'none' } = {}) {
  out.push(
    h(Rect, {
      key: key(),
      x,
      y: Y(y + hgt),
      width: w,
      height: hgt,
      stroke: fill === 'none' ? color : 'none',
      strokeWidth: width,
      fill,
    }),
  )
}

function text(out, x, y, str, { size = 7, bold = false, color = BLACK, anchor = 'start' } = {}) {
  if (str === undefined || str === null || str === '') return
  out.push(
    h(
      Text,
      {
        key: key(),
        x,
        y: Y(y),
        style: {
          fontSize: size,
          fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica',
          fill: color,
        },
        textAnchor: anchor,
      },
      String(str),
    ),
  )
}

// vertical text reading bottom-to-top, anchored at (x, y) in reportlab coords
function vtext(out, x, y, str, { size = 7, bold = false, color = BLACK } = {}) {
  if (str === undefined || str === null || str === '') return
  const px = x
  const py = Y(y)
  out.push(
    h(
      Text,
      {
        key: key(),
        x: px,
        y: py,
        transform: `rotate(-90 ${px} ${py})`,
        style: {
          fontSize: size,
          fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica',
          fill: color,
        },
        textAnchor: 'start',
      },
      String(str),
    ),
  )
}

function circle(out, cx, cy, r, { fill = GRAY } = {}) {
  out.push(h(Circle, { key: key(), cx, cy: Y(cy), r, fill, stroke: 'none' }))
}

// ---- numeric helpers ----
function safeFloat(v, d = 0) {
  if (v === null || v === undefined || v === '') return d
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

// Map AS1726 frontend strength words -> 1..6 grid column (VL,L,M,H,VH,EH).
const STRENGTH_CODE = {
  EXTREMELYLOW: 1,
  VERYLOW: 1,
  VL: 1,
  LOW: 2,
  L: 2,
  MEDIUM: 3,
  M: 3,
  HIGH: 4,
  H: 4,
  VERYHIGH: 5,
  VH: 5,
  EXTREMELYHIGH: 6,
  EH: 6,
}

// deterministic PRNG so SANDSTONE stipple is stable across renders
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(s) {
  const str = String(s || 'seed')
  let hsh = 0
  for (let i = 0; i < str.length; i++) hsh = (Math.imul(31, hsh) + str.charCodeAt(i)) | 0
  return hsh || 42
}

function wrapText(str, maxChars) {
  const words = String(str).split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur)
      cur = w
    } else {
      cur = (cur ? cur + ' ' : '') + w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// ---- section builders (ported from rock_pdf.py) ----
function drawHeader(out, data) {
  const project = data.project || {}
  const borehole = data.borehole || {}

  rect(out, 30, 710, 535, 100)
  line(out, 30, 770, 565, 770)

  text(out, 35, 785, 'STS', { size: 36, bold: true, color: STS_GREEN })
  text(out, 35, 775, 'GEOTECHNICS PTY LTD', { size: 8, bold: true, color: GRAY })
  text(out, 35, 772, 'CONSULTING GEOTECHNICAL ENGINEERS', { size: 6, color: GRAY })

  text(out, 297, 785, 'BOREHOLE LOG', { size: 18, anchor: 'middle' })

  line(out, 400, 770, 400, 810)
  text(out, 560, 792, `BH ID: ${borehole.borehole_id || 'BH01'}`, { size: 16, anchor: 'end' })

  line(out, 30, 750, 565, 750)
  line(out, 30, 730, 565, 730)
  line(out, 250, 710, 250, 770)
  line(out, 400, 710, 400, 770)
  line(out, 480, 710, 480, 770)

  text(out, 32, 760, 'Client', { bold: true })
  text(out, 32, 752, 'Job No.', { bold: true })
  text(out, 252, 760, 'Date', { bold: true })
  text(out, 252, 752, 'Logged By', { bold: true })
  text(out, 402, 752, 'Review By', { bold: true })

  text(out, 70, 760, project.client || '')
  text(out, 70, 752, project.project_no || project.projectNumber || '')
  text(out, 290, 760, project.date || '')
  text(out, 290, 752, project.logged_by || '')
  text(out, 440, 752, project.reviewed_by || '')

  text(out, 32, 738, 'Address', { bold: true })
  text(out, 252, 738, 'Location #', { bold: true })
  text(out, 70, 738, project.address || '')
  text(out, 290, 738, project.location_no || '-')

  text(out, 32, 720, 'Drilling Contractor', { bold: true })
  text(out, 32, 712, 'Plant', { bold: true })
  text(out, 252, 720, 'Surface RL', { bold: true })
  text(out, 252, 712, 'Inclination', { bold: true })
  text(out, 402, 720, 'Drill Bit', { bold: true })
  text(out, 402, 712, 'Hole Ø (mm)', { bold: true })

  text(out, 110, 720, borehole.drilling_contractor || '')
  text(out, 110, 712, borehole.rig || '')
  const sRl = borehole.surface_rl
  text(out, 300, 720, sRl ? `≈${sRl} m (AHD)` : '')
  const inc = borehole.inclination
  text(out, 300, 712, inc ? `${inc}°` : '')
  text(out, 450, 720, borehole.drill_bit || '')
  text(out, 450, 712, borehole.hole_diameter_mm != null ? String(borehole.hole_diameter_mm) : '')
}

function drawColumnHeaders(out) {
  rect(out, 30, 620, 535, 90)

  vtext(out, 40, 630, 'METHOD', { size: 7 })
  vtext(out, 60, 630, 'Flush Return', { size: 7 })
  vtext(out, 80, 630, 'TCR %', { size: 7 })
  vtext(out, 100, 630, 'RQD %', { size: 7 })
  vtext(out, 120, 630, 'DEPTH (m)', { size: 7 })
  vtext(out, 155, 630, 'GRAPHIC', { size: 7 })
  vtext(out, 165, 630, 'LOG', { size: 7 })
  vtext(out, 185, 630, 'RL (m AHD)', { size: 7 })

  text(out, 275, 665, 'MATERIAL DESCRIPTION', { size: 7, anchor: 'middle' })

  vtext(out, 365, 630, 'WEATHERING', { size: 7 })

  text(out, 410, 702, 'ESTIMATED', { size: 5, anchor: 'middle' })
  text(out, 410, 695, 'STRENGTH', { size: 5, anchor: 'middle' })
  text(out, 410, 688, 'Is(50)', { size: 5, anchor: 'middle' })
  text(out, 410, 681, '▼ - Axial', { size: 5, anchor: 'middle' })
  text(out, 410, 674, '▽ - Diametral', { size: 5, anchor: 'middle' })

  let sX = 385
  for (const lbl of ['VL 0.1', 'L 0.3', 'M 1', 'H 3', 'VH 10', 'EH']) {
    vtext(out, sX + 4, 622, lbl, { size: 5 })
    sX += 8.33
  }
  line(out, 385, 670, 435, 670)

  text(out, 477, 665, 'DISCONTINUITIES', { size: 7, anchor: 'middle' })
  text(out, 477, 655, '& ADDITIONAL DATA', { size: 7, anchor: 'middle' })

  text(out, 542, 700, 'FRACTURE', { size: 5, anchor: 'middle' })
  text(out, 542, 693, 'SPACING', { size: 5, anchor: 'middle' })
  line(out, 520, 660, 565, 660)

  let fX = 520
  for (const lbl of ['30', '100', '300', '1000', '3000']) {
    vtext(out, fX + 4, 622, lbl, { size: 5 })
    fX += 9
  }
}

function drawColumnLines(out) {
  const cols = [30, 50, 70, 90, 110, 140, 175, 195, 355, 385, 435, 520, 565]
  for (const x of cols) line(out, x, 80, x, 710)

  let sX = 385
  for (let i = 0; i < 5; i++) {
    sX += 8.33
    line(out, sX, 80, sX, 670, { color: GRAY, width: 0.5 })
  }
  let fX = 520
  for (let i = 0; i < 4; i++) {
    fX += 9
    line(out, fX, 80, fX, 660, { color: GRAY, width: 0.5 })
  }
}

function drawDepthScale(out, pageStart, pageEnd, depthToY) {
  let d = pageStart
  while (d <= pageEnd + 0.01) {
    const y = depthToY(d)
    const dr = Math.round(d * 100) / 100
    const isMajor = Math.abs(dr - Math.round(dr)) < 0.01
    if (isMajor) {
      line(out, 140, y, 130, y)
      text(out, 125, y - 2, `${Math.round(dr)}`, { size: 7, anchor: 'middle' })
    } else {
      line(out, 140, y, 135, y)
    }
    d += 0.1
  }
}

function drawLithologies(out, units, pageStart, pageEnd, depthToY) {
  for (const u of units) {
    const uFrom = safeFloat(u.from != null ? u.from : u.depth_from, 0)
    const uTo = safeFloat(u.to != null ? u.to : u.depth_to, 5)
    if (uTo <= pageStart || uFrom >= pageEnd) continue

    const uStart = Math.max(pageStart, uFrom)
    const uFinish = Math.min(pageEnd, uTo)
    const yTop = depthToY(uStart)
    const yBottom = depthToY(uFinish)

    if (yBottom > 80.1) line(out, 140, yBottom, 385, yBottom)

    const material = String(u.material || '').toUpperCase()
    if (material.includes('SILTSTONE') || material.includes('SHALE') || material.includes('MUDSTONE')) {
      let dy = yBottom + 2
      while (dy < yTop) {
        line(out, 140, dy, 175, dy, { color: GRAY, width: 0.5 })
        dy += 2
      }
    } else if (material.includes('SANDSTONE')) {
      const rnd = mulberry32(hashSeed(u.id))
      for (let i = 0; i < 30; i++) {
        const cx = 142 + rnd() * 31
        const cy = yBottom + 1 + rnd() * Math.max(0.1, yTop - yBottom - 2)
        circle(out, cx, cy, 0.5)
      }
    } else {
      // generic diagonal hatch, clamped to the graphic box
      for (let off = 0; off < 35; off += 5) {
        const x1 = 140 + off
        const y1 = yBottom
        const x2 = Math.min(175, 140 + off + (yTop - yBottom))
        const y2 = Math.min(yTop, yBottom + (175 - (140 + off)))
        line(out, x1, y1, x2, y2, { color: LIGHTGREY, width: 0.5 })
      }
    }

    // description (manual wrap ~ 156pt width @ 7pt Helvetica)
    const desc = u.description || ''
    if (desc) {
      const lines = wrapText(desc, 46)
      let ly = yTop - 9
      for (const ln of lines) {
        if (ly < yBottom + 1) break
        text(out, 197, ly, ln, { size: 7 })
        ly -= 8
      }
    }

    text(out, 370, yTop - 12, u.weathering || '', { size: 7, anchor: 'middle' })

    const code = STRENGTH_CODE[String(u.strength || '').toUpperCase()]
    if (code) {
      const stX = 385 + code * 8.33
      rect(out, 385, yBottom, stX - 385, yTop - yBottom, { fill: LIGHTGREY })
    }
  }
}

function drawCoreRuns(out, runs, pageStart, pageEnd, depthToY) {
  for (const r of runs) {
    const rFrom = safeFloat(r.from != null ? r.from : r.depth_from != null ? r.depth_from : r.depthFromM, 0)
    const rTo = safeFloat(r.to != null ? r.to : r.depth_to != null ? r.depth_to : r.depthToM, 5)
    if (rTo <= pageStart || rFrom >= pageEnd) continue

    const rStart = Math.max(pageStart, rFrom)
    const rFinish = Math.min(pageEnd, rTo)
    const yTop = depthToY(rStart)
    const yBottom = depthToY(rFinish)
    if (yBottom > 80.1) line(out, 30, yBottom, 110, yBottom)

    const yMid = (yTop + yBottom) / 2
    vtext(out, 40, yMid - 12, 'NMLC', { size: 7 })

    let tcr = r.tcr != null ? r.tcr : r.tcrPercent
    let rqd = r.rqd != null ? r.rqd : r.rqdPercent
    tcr = tcr === undefined || tcr === null || tcr === '' ? '' : `${Math.round(safeFloat(tcr))}`
    rqd = rqd === undefined || rqd === null || rqd === '' ? '' : `${Math.round(safeFloat(rqd))}`
    vtext(out, 80, yMid - 5, tcr, { size: 7 })
    vtext(out, 100, yMid - 5, rqd, { size: 7 })
  }
}

function drawDiscontinuities(out, disconts, pageStart, pageEnd, depthToY) {
  const inPage = disconts
    .filter((d) => {
      const dd = safeFloat(d.depth, 0)
      return dd >= pageStart && dd <= pageEnd
    })
    .sort((a, b) => safeFloat(a.depth, 0) - safeFloat(b.depth, 0))

  let lastY = 999
  for (const d of inPage) {
    const dDepth = safeFloat(d.depth, 0)
    const yD = depthToY(dDepth)
    const parts = []
    if (d.defect_type || d.type) parts.push(String(d.defect_type || d.type))
    if (d.angle != null) parts.push(`${d.angle}°`)
    if (d.shape) parts.push(String(d.shape))
    if (d.roughness) parts.push(String(d.roughness))
    if (d.infilling) parts.push(String(d.infilling))
    const codeStr = parts.length ? `${dDepth.toFixed(2)}: ${parts.join(' ')}` : `${dDepth.toFixed(2)}`

    let yText = yD - 2
    if (lastY - yText < 8) yText = lastY - 8
    lastY = yText
    text(out, 440, yText, codeStr.slice(0, 40), { size: 6.5 })
  }
}

function drawFooter(out, pageIdx, pagesCount) {
  rect(out, 30, 30, 535, 50)
  text(out, 297, 72, 'Notes: See explanation sheets for meaning of all descriptive terms and symbols', {
    size: 7,
    anchor: 'middle',
  })
  line(out, 30, 68, 565, 68)
  text(out, 32, 58, 'D - disturbed sample', { size: 7 })
  text(out, 32, 48, 'U - undisturbed tube sample', { size: 7 })
  text(out, 180, 58, 'S - jar sample', { size: 7 })
  text(out, 180, 48, 'B - bulk sample', { size: 7 })
  text(out, 330, 58, 'WT - level of water table or free water', { size: 7 })
  text(out, 330, 48, 'N - Standard Penetration Test (SPT)', { size: 7 })
  line(out, 480, 68, 480, 30)
  text(out, 522, 45, `Sheet ${pageIdx} of ${pagesCount}`, { size: 10, anchor: 'middle' })
}

function buildPage(data, pageIdx, pagesCount, pageStart, pageEnd) {
  const scaleFactor = 540.0 / 5.0
  const depthToY = (d) => {
    const val = 620.0 - (d - pageStart) * scaleFactor
    return Math.max(80.0, Math.min(620.0, val))
  }

  const out = []
  drawHeader(out, data)
  drawColumnHeaders(out)
  drawColumnLines(out)
  drawDepthScale(out, pageStart, pageEnd, depthToY)
  drawLithologies(out, data.lithology_units || [], pageStart, pageEnd, depthToY)
  drawCoreRuns(out, data.core_runs || [], pageStart, pageEnd, depthToY)
  drawDiscontinuities(out, data.discontinuities || [], pageStart, pageEnd, depthToY)
  drawFooter(out, pageIdx, pagesCount)

  return h(
    Page,
    { key: `p${pageIdx}`, size: 'A4', style: { padding: 0, backgroundColor: '#ffffff' } },
    h(Svg, { width: PAGE_W, height: PAGE_H - 1, viewBox: `0 0 ${PAGE_W} ${PAGE_H}` }, out),
  )
}

export function OpenGroundDocument({ data }) {
  _k = 0
  const d = data || {}
  const borehole = d.borehole || {}
  const depthFrom = safeFloat(borehole.depth_from, 0)
  let depthTo = safeFloat(borehole.depth_to, 5)
  let span = depthTo - depthFrom
  if (span <= 0) {
    span = 5
    depthTo = depthFrom + 5
  }
  const metersPerPage = 5.0
  const pagesCount = Math.max(1, Math.ceil(span / metersPerPage))

  const pages = []
  for (let i = 1; i <= pagesCount; i++) {
    const pageStart = depthFrom + (i - 1) * metersPerPage
    const pageEnd = Math.min(depthTo, pageStart + metersPerPage)
    pages.push(buildPage(d, i, pagesCount, pageStart, pageEnd))
  }
  return h(Document, { title: `Borehole Log ${borehole.borehole_id || ''}` }, pages)
}

/**
 * Build the backend-shaped data object from the frontend project / layers /
 * defects state. Keeps a single source of truth for both the live preview and
 * any future server export call.
 */
export function buildLogData({ projectName, holeId, project, layers, defects }) {
  const p = project || {}
  const sortedLayers = [...(layers || [])]
    .filter((l) => l.depthFrom != null && l.depthTo != null)
    .sort((a, b) => a.depthFrom - b.depthFrom)

  const depthFrom = sortedLayers.length ? sortedLayers[0].depthFrom : 0
  const depthTo = sortedLayers.length ? sortedLayers[sortedLayers.length - 1].depthTo : 5

  return {
    project: {
      client: p.client || projectName || '',
      project_no: p.project_no || '',
      date: p.date || '',
      logged_by: p.logged_by || '',
      reviewed_by: p.reviewed_by || '',
      address: p.address || '',
      location_no: p.location_no || holeId || '',
    },
    borehole: {
      borehole_id: holeId || 'BH01',
      depth_from: depthFrom,
      depth_to: depthTo,
      drilling_contractor: p.drilling_contractor || '',
      rig: p.rig || '',
      surface_rl: p.surface_rl || '',
      inclination: p.inclination || 90,
      drill_bit: p.drill_bit || '',
      hole_diameter_mm: p.hole_diameter_mm || '',
    },
    lithology_units: sortedLayers.map((l) => ({
      id: l.id,
      from: l.depthFrom,
      to: l.depthTo,
      material: l.major || (l.type === 'rock' ? 'ROCK' : 'SOIL'),
      description: l.description || '',
      weathering: l.weathering || '',
      strength: l.strength || '',
    })),
    core_runs: sortedLayers
      .filter((l) => l.type === 'rock')
      .map((l) => ({ from: l.depthFrom, to: l.depthTo, tcr: l.tcr, rqd: l.rqd })),
    discontinuities: (defects || []).map((dft) => ({
      depth: dft.depth,
      defect_type: dft.type,
      angle: dft.angle,
    })),
  }
}

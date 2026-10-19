import { FURNITURE } from './catalog.js'
import { wallLength } from './geometry.js'
import { printHtml } from './printFrame.js'

const FLOOR = {
  'tile-sand': '#f4e7d6',
  'tile-white': '#f6f4ef',
  'wood-floor': '#e8c9a6',
  epoxy: '#d7e3e7',
  'concrete-floor': '#e6e1da',
}

export function planHtml(project) {
  const sheets = project.levels.map((level) => levelSheet(project, level)).filter(Boolean)
  const body = sheets.length ? sheets.join('') : emptySheet(project)
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>แปลน ${escapeHtml(project.name)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #1d1a16; font-family: "Leelawadee UI", "Segoe UI", sans-serif; }
      .sheet { break-after: page; page-break-after: always; }
      .sheet:last-child { break-after: auto; page-break-after: auto; }
      header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; margin-bottom: 6px; }
      h1 { font-size: 22px; margin: 0; }
      p { margin: 2px 0 0; color: #5c564e; font-size: 13px; }
      .meta { font-size: 12px; color: #8a8178; text-align: right; }
      svg { width: 100%; height: auto; display: block; }
      footer { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; font-size: 12px; color: #5c564e; }
      .swatch { display: inline-block; width: 14px; height: 8px; margin-right: 4px; vertical-align: middle; border: 1px solid #2a2622; }
      .empty { padding: 48px 12px; font-size: 16px; }
    </style></head><body>${body}</body></html>`
}

export function printPlan(project) {
  return printHtml(planHtml(project))
}

function levelSheet(project, level) {
  const elements = project.elements.filter((item) => item.levelId === level.id)
  const walls = elements.filter((item) => item.type === 'wall')
  const wallBounds = measureBounds(walls)
  const fitBounds = measureBounds(elements.filter((item) => item.type !== 'label')) || wallBounds
  if (!fitBounds && !wallBounds) return ''
  const bounds = fitBounds || wallBounds
  const sized = wallBounds || bounds
  bounds.minX -= 0.6
  bounds.maxX += 0.6
  bounds.minZ -= 0.8
  bounds.maxZ += 0.4
  const drawing = drawLevel(elements, walls, bounds, sized)
  const width = (sized.maxX - sized.minX).toFixed(2)
  const depth = (sized.maxZ - sized.minZ).toFixed(2)
  return `<section class="sheet">
    <header>
      <div>
        <h1>แปลน${escapeHtml(level.name)}</h1>
        <p>${escapeHtml(project.name)} · ระดับพื้น ${level.elevation.toFixed(2)} ม. · สูงชั้น ${level.height.toFixed(2)} ม. · กว้าง ${width} ม. · ลึก ${depth} ม.</p>
      </div>
      <div class="meta">แปลนแนวคิดจากโมเดลเดียวกัน<br>ไม่ใช่แบบขออนุญาตก่อสร้าง</div>
    </header>
    ${drawing}
    <footer>
      <span><i class="swatch" style="background:#f7f4ef"></i>ผนัง</span>
      <span><i class="swatch" style="background:#fff"></i>ประตูมีเส้นเปิด</span>
      <span><i class="swatch" style="background:#d7eef5"></i>หน้าต่าง</span>
      <span><i class="swatch" style="background:#2a2622"></i>เสา</span>
      <span>มิติวัดถึงแนวศูนย์ผนัง หน่วยเป็นเมตร · ทิศเหนือชี้ขึ้น</span>
    </footer>
  </section>`
}

function emptySheet(project) {
  return `<section class="sheet"><h1>แปลน${escapeHtml(project.name)}</h1><p class="empty">ยังไม่มีผนังหรือพื้นให้พิมพ์แปลน ลากห้องลงบนที่ดินก่อน</p></section>`
}

function drawLevel(elements, walls, bounds, sized) {
  const boxX = 78
  const boxY = 36
  const boxW = 900
  const boxH = 560
  const worldW = Math.max(bounds.maxX - bounds.minX, 0.5)
  const worldD = Math.max(bounds.maxZ - bounds.minZ, 0.5)
  const scale = Math.min((boxW - 28) / worldW, (boxH - 28) / worldD)
  const ox = boxX + (boxW - worldW * scale) / 2
  const oy = boxY + (boxH - worldD * scale) / 2
  const P = (x, z) => ({
    x: ox + (x - bounds.minX) * scale,
    y: oy + (bounds.maxZ - z) * scale,
  })
  const centroid = {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  }
  const parts = []
  for (const slab of elements.filter((item) => item.type === 'slab')) parts.push(slabShape(slab, P))
  for (const wall of walls) parts.push(wallShape(wall))
  for (const opening of elements.filter((item) => item.type === 'door' || item.type === 'window')) {
    const wall = walls.find((item) => item.id === opening.wallId)
    if (wall) parts.push(openingShape(wall, opening, centroid, P))
  }
  for (const column of elements.filter((item) => item.type === 'column')) parts.push(columnShape(column, P))
  for (const stair of elements.filter((item) => item.type === 'stair')) parts.push(stairShape(stair, P))
  for (const piece of elements.filter((item) => item.type === 'furniture')) parts.push(furnitureShape(piece, P))
  for (const label of elements.filter((item) => item.type === 'label')) parts.push(labelShape(label, P))
  parts.push(dimensions(sized, bounds, P))
  parts.push(scaleBar(scale))
  parts.push(northArrow())
  return `<svg viewBox="0 0 1100 700" role="img">${parts.join('')}</svg>`

  function wallShape(wall) {
    const low = wall.height <= 1.25
    const glass = wall.finish === 'glass'
    const dash = low ? ' stroke-dasharray="7 4"' : ''
    const fill = glass ? '#e7f4f8' : '#f7f4ef'
    const stroke = glass ? '#6aa0b0' : '#2a2622'
    return `<polygon points="${polyPoints(wallPolygon(wall), P)}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"${dash}/>`
  }
}

function measureBounds(elements) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let found = false
  const add = (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return
    found = true
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  for (const el of elements) {
    if (el.type === 'wall') wallPolygon(el).forEach((point) => add(point.x, point.z))
    else if (el.type === 'slab' || el.type === 'stair') {
      add(el.x, el.z)
      add(el.x + el.w, el.z + el.d)
    } else if (el.type === 'column') {
      add(el.x - el.w / 2, el.z - el.d / 2)
      add(el.x + el.w / 2, el.z + el.d / 2)
    } else if (el.type === 'furniture') furnitureCorners(el).forEach((point) => add(point.x, point.z))
    else if (el.type === 'label') add(el.x, el.z)
  }
  if (!found) return null
  return { minX, maxX, minZ, maxZ }
}

function wallPolygon(wall) {
  const len = wallLength(wall) || 1
  const tx = (wall.x2 - wall.x1) / len
  const tz = (wall.z2 - wall.z1) / len
  const half = (wall.thickness || 0.15) / 2
  const px = -tz * half
  const pz = tx * half
  return [
    { x: wall.x1 + px, z: wall.z1 + pz },
    { x: wall.x2 + px, z: wall.z2 + pz },
    { x: wall.x2 - px, z: wall.z2 - pz },
    { x: wall.x1 - px, z: wall.z1 - pz },
  ]
}

function openingShape(wall, opening, centroid, P) {
  const len = wallLength(wall) || 1
  const tx = (wall.x2 - wall.x1) / len
  const tz = (wall.z2 - wall.z1) / len
  const center = opening.t * len
  const half = opening.width / 2
  const cut = segmentPolygon(wall, center - half, center + half, (wall.thickness || 0.15) * 0.72)
  const gap = `<polygon points="${polyPoints(cut, P)}" fill="#fff" stroke="none" class="${opening.type}"/>`
  if (opening.type === 'window') {
    const glass = segmentPolygon(wall, center - half, center + half, (wall.thickness || 0.15) * 0.28)
    return `${gap}<polygon points="${polyPoints(glass, P)}" fill="#d7eef5" stroke="#3d6f86" stroke-width="1" class="window"/>`
  }
  const hingeDist = center - half
  const hinge = {
    x: wall.x1 + tx * hingeDist,
    z: wall.z1 + tz * hingeDist,
  }
  const closed = { x: tx * opening.width, z: tz * opening.width }
  const px = -tz
  const pz = tx
  const toward = (centroid.x - hinge.x) * px + (centroid.z - hinge.z) * pz
  const side = toward >= 0 ? 1 : -1
  const open = { x: px * side * opening.width, z: pz * side * opening.width }
  const leafEnd = P(hinge.x + open.x, hinge.z + open.z)
  const start = P(hinge.x, hinge.z)
  const arc = []
  for (let i = 0; i <= 14; i += 1) {
    const t = (i / 14) * (Math.PI / 2)
    const point = P(hinge.x + closed.x * Math.cos(t) + open.x * Math.sin(t), hinge.z + closed.z * Math.cos(t) + open.z * Math.sin(t))
    arc.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`)
  }
  return `${gap}<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${leafEnd.x.toFixed(1)}" y2="${leafEnd.y.toFixed(1)}" stroke="#1d1a16" stroke-width="1.2" class="door"/><polyline points="${arc.join(' ')}" fill="none" stroke="#8a8178" stroke-width="0.8" class="door"/>`
}

function segmentPolygon(wall, from, to, halfThick) {
  const len = wallLength(wall) || 1
  const tx = (wall.x2 - wall.x1) / len
  const tz = (wall.z2 - wall.z1) / len
  const px = -tz * halfThick
  const pz = tx * halfThick
  const a = { x: wall.x1 + tx * from, z: wall.z1 + tz * from }
  const b = { x: wall.x1 + tx * to, z: wall.z1 + tz * to }
  return [
    { x: a.x + px, z: a.z + pz },
    { x: b.x + px, z: b.z + pz },
    { x: b.x - px, z: b.z - pz },
    { x: a.x - px, z: a.z - pz },
  ]
}

function slabShape(slab, P) {
  const points = [P(slab.x, slab.z), P(slab.x + slab.w, slab.z), P(slab.x + slab.w, slab.z + slab.d), P(slab.x, slab.z + slab.d)]
  return `<polygon points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}" fill="${FLOOR[slab.finish] || '#f3efe8'}" stroke="none"/>`
}

function columnShape(column, P) {
  const points = [
    P(column.x - column.w / 2, column.z - column.d / 2),
    P(column.x + column.w / 2, column.z - column.d / 2),
    P(column.x + column.w / 2, column.z + column.d / 2),
    P(column.x - column.w / 2, column.z + column.d / 2),
  ]
  return `<polygon points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}" fill="#2a2622"/>`
}

function stairShape(stair, P) {
  const a = P(stair.x, stair.z)
  const b = P(stair.x + stair.w, stair.z + stair.d)
  const left = Math.min(a.x, b.x)
  const right = Math.max(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const bottom = Math.max(a.y, b.y)
  const steps = Math.max(4, Math.min(stair.steps || 12, 22))
  const lines = []
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps
    if (stair.dir === 'x') {
      const x = left + (right - left) * t
      lines.push(`<line x1="${x.toFixed(1)}" y1="${top.toFixed(1)}" x2="${x.toFixed(1)}" y2="${bottom.toFixed(1)}" stroke="#8a8178" stroke-width="0.7"/>`)
    } else {
      const y = top + (bottom - top) * t
      lines.push(`<line x1="${left.toFixed(1)}" y1="${y.toFixed(1)}" x2="${right.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#8a8178" stroke-width="0.7"/>`)
    }
  }
  const midX = (left + right) / 2
  const midY = (top + bottom) / 2
  return `<rect x="${left.toFixed(1)}" y="${top.toFixed(1)}" width="${(right - left).toFixed(1)}" height="${(bottom - top).toFixed(1)}" fill="#fbfaf7" stroke="#5c564e" stroke-width="1"/>${lines.join('')}<text x="${midX.toFixed(1)}" y="${midY.toFixed(1)}" text-anchor="middle" font-size="12" fill="#5c564e">บันได ${stair.steps || ''} ขั้น</text>`
}

function furnitureShape(piece, P) {
  if (piece.kind === 'person') {
    const center = P(piece.x, piece.z)
    return `<circle cx="${center.x.toFixed(1)}" cy="${center.y.toFixed(1)}" r="7" fill="none" stroke="#8a8178"/>`
  }
  const points = furnitureCorners(piece).map((point) => P(point.x, point.z))
  const name = FURNITURE[piece.kind]?.name || 'เฟอร์นิเจอร์'
  const center = P(piece.x, piece.z)
  return `<polygon points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}" fill="#f6efe4" stroke="#8a5a3a" stroke-width="1"/><text x="${center.x.toFixed(1)}" y="${(center.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#6a4a32">${escapeHtml(name)}</text>`
}

function labelShape(label, P) {
  const point = P(label.x, label.z)
  return `<text x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="#1f4d45">${escapeHtml(label.text || '')}</text>`
}

function dimensions(bounds, fit, P) {
  const sw = P(bounds.minX, bounds.minZ)
  const se = P(bounds.maxX, bounds.minZ)
  const nw = P(bounds.minX, bounds.maxZ)
  const fitSW = P(fit.minX, fit.minZ)
  const fitSE = P(fit.maxX, fit.minZ)
  const fitNW = P(fit.minX, fit.maxZ)
  const y = Math.max(sw.y, se.y, fitSW.y, fitSE.y) + 26
  const x = Math.min(nw.x, sw.x, fitNW.x, fitSW.x) - 28
  const width = (bounds.maxX - bounds.minX).toFixed(2)
  const depth = (bounds.maxZ - bounds.minZ).toFixed(2)
  const midX = (sw.x + se.x) / 2
  const midY = (nw.y + sw.y) / 2
  return `<g class="dim" fill="none" stroke="#1f4d45" stroke-width="0.8">
    <line x1="${sw.x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${se.x.toFixed(1)}" y2="${y.toFixed(1)}"/>
    <line x1="${sw.x.toFixed(1)}" y1="${(sw.y + 6).toFixed(1)}" x2="${sw.x.toFixed(1)}" y2="${(y + 4).toFixed(1)}"/>
    <line x1="${se.x.toFixed(1)}" y1="${(se.y + 6).toFixed(1)}" x2="${se.x.toFixed(1)}" y2="${(y + 4).toFixed(1)}"/>
    <line x1="${x.toFixed(1)}" y1="${nw.y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${sw.y.toFixed(1)}"/>
    <line x1="${(nw.x - 6).toFixed(1)}" y1="${nw.y.toFixed(1)}" x2="${(x - 4).toFixed(1)}" y2="${nw.y.toFixed(1)}"/>
    <line x1="${(sw.x - 6).toFixed(1)}" y1="${sw.y.toFixed(1)}" x2="${(x - 4).toFixed(1)}" y2="${sw.y.toFixed(1)}"/>
  </g>
  <text x="${midX.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="12" fill="#1f4d45">${width} ม.</text>
  <text x="${(x - 8).toFixed(1)}" y="${midY.toFixed(1)}" text-anchor="middle" font-size="12" fill="#1f4d45" transform="rotate(-90 ${(x - 8).toFixed(1)} ${midY.toFixed(1)})">${depth} ม.</text>`
}

function scaleBar(scale) {
  const choices = [1, 2, 5, 10, 20, 50]
  let meters = 1
  for (const choice of choices) {
    if (choice * scale <= 150) meters = choice
  }
  const width = meters * scale
  return `<g class="scale">
    <rect x="900" y="648" width="${width.toFixed(1)}" height="8" fill="#1f4d45"/>
    <text x="900" y="644" font-size="11" fill="#1f4d45">${meters.toFixed(0)} ม.</text>
  </g>`
}

function northArrow() {
  return `<g class="north">
    <polygon points="1048,28 1056,58 1040,58" fill="#1f4d45"/>
    <text x="1048" y="74" text-anchor="middle" font-size="12" fill="#1f4d45">เหนือ</text>
  </g>`
}

function furnitureCorners(piece) {
  const spec = FURNITURE[piece.kind] || {}
  const w = piece.w || spec.w || 1
  const d = piece.d || spec.d || 1
  const rot = piece.rot || 0
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([lx, lz]) => ({
    x: piece.x + lx * c + lz * s,
    z: piece.z - lx * s + lz * c,
  }))
}

function polyPoints(points, P) {
  return points.map((point) => {
    const mapped = P(point.x, point.z)
    return `${mapped.x.toFixed(1)},${mapped.y.toFixed(1)}`
  }).join(' ')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

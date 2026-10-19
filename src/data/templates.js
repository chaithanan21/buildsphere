import { ceilingY, engineeringElement, furnitureElement, makeBeam, makeColumn, makeLabel, makeSlab, makeWall, placeOpening } from '../lib/assemble.js'
import { DEFAULT_RATES } from '../lib/catalog.js'
import { wallLength } from '../lib/geometry.js'
import { uid } from '../lib/ids.js'

export function isProject(value) {
  return Boolean(value && Array.isArray(value.levels) && value.levels.length && Array.isArray(value.elements) && value.roof && value.site)
}

export function normalizeProject(project) {
  const blank = emptyProject()
  return {
    ...blank,
    ...project,
    site: { ...blank.site, ...project.site },
    roof: { ...blank.roof, ...project.roof },
    rates: { ...DEFAULT_RATES, ...(project.rates || {}) },
    waste: project.waste ?? 0.05,
    paintSides: project.paintSides === 1 ? 1 : 2,
    autoStructure: project.autoStructure !== false,
    structureMaterial: project.structureMaterial || 'concrete',
  }
}

export function emptyProject() {
  return base('ที่ดินเปล่า — วันที่ 1', { width: 32, depth: 24 }, [
    { id: 'gf', name: 'ชั้น 1', elevation: 0, height: 3.2 },
  ], [], { type: 'none', pitch: 32, overhang: 0.6, material: 'roof-tile' }, 'concrete')
}

export function houseProject() {
  const gf = { id: 'gf', name: 'ชั้น 1', elevation: 0, height: 3.2 }
  const f2 = { id: 'f2', name: 'ชั้น 2', elevation: 3.2, height: 3 }
  const project = base(
    'บ้าน 2 ชั้นพร้อมตกแต่ง',
    { width: 32, depth: 26 },
    [gf, f2],
    [],
    { type: 'gable', pitch: 32, overhang: 0.7, material: 'roof-tile' },
    'concrete',
  )
  const elements = []
  const xs = [-1, 3, 7]
  const zs = [-5, 0, 5]
  for (const level of [gf, f2]) {
    for (const x of xs) for (const z of zs) elements.push(makeColumn(level, x, z, 'concrete', 0.25))
    for (const z of zs) {
      for (let i = 0; i < xs.length - 1; i += 1) elements.push(makeBeam(project, level, xs[i], z, xs[i + 1], z))
    }
    for (const x of xs) {
      for (let i = 0; i < zs.length - 1; i += 1) elements.push(makeBeam(project, level, x, zs[i], x, zs[i + 1]))
    }
  }
  for (const x of xs) for (const z of zs) {
    elements.push(engineeringElement(gf, 'pile', { x, z }))
    elements.push(engineeringElement(gf, 'pile-cap', { x, z }))
    elements.push(engineeringElement(gf, 'pad', { x, z }))
  }
  elements.push(
    engineeringElement(gf, 'sand', { x: 3, z: 0, w: 10.4, d: 12.4 }),
    engineeringElement(gf, 'lean', { x: 3, z: 0, w: 10, d: 12 }),
    engineeringElement(gf, 'ground-beam', { x1: -1, z1: -5, x2: 7, z2: -5 }),
    engineeringElement(gf, 'ground-beam', { x1: 7, z1: -5, x2: 7, z2: 5 }),
    engineeringElement(gf, 'ground-beam', { x1: 7, z1: 5, x2: -1, z2: 5 }),
    engineeringElement(gf, 'ground-beam', { x1: -1, z1: 5, x2: -1, z2: -5 }),
  )

  const gfWalls = {
    s: makeWall(gf, -1, -5, 7, -5),
    e: makeWall(gf, 7, -5, 7, 5),
    n: makeWall(gf, 7, 5, -1, 5),
    w: makeWall(gf, -1, 5, -1, -5),
    hall: makeWall(gf, -1, 2, 4.8, 2),
    kit: makeWall(gf, 3, 2, 3, 5),
    bath: makeWall(gf, 3, 3.4, 4.8, 3.4),
    bathE: makeWall(gf, 4.8, 3.4, 4.8, 5),
  }
  elements.push(...Object.values(gfWalls))
  elements.push(
    open(gfWalls.s, 3, -5, { type: 'door', width: 1, height: 2.2 }),
    open(gfWalls.s, 1, -5, { type: 'window', width: 1.4, height: 1.2, sill: 0.9 }),
    open(gfWalls.s, 5.5, -5, { type: 'window', width: 1.4, height: 1.2, sill: 0.9 }),
    open(gfWalls.w, -1, -2.2, { type: 'window', width: 1.5, height: 1.2, sill: 0.9 }),
    open(gfWalls.w, -1, 3.6, { type: 'window', width: 1.2, height: 1.1, sill: 1 }),
    open(gfWalls.e, 7, -2, { type: 'window', width: 1.2, height: 1.2, sill: 0.9 }),
    open(gfWalls.n, 1, 5, { type: 'window', width: 1.2, height: 1, sill: 1 }),
    open(gfWalls.n, 3.9, 5, { type: 'window', width: 0.6, height: 0.6, sill: 1.4 }),
    open(gfWalls.hall, 1.2, 2, { type: 'door', width: 0.9, height: 2.1 }),
    open(gfWalls.hall, 3.9, 2, { type: 'door', width: 0.8, height: 2.1 }),
    open(gfWalls.bath, 3.9, 3.4, { type: 'door', width: 0.75, height: 2.1 }),
  )

  const f2Walls = {
    s: makeWall(f2, -1, -5, 7, -5),
    e: makeWall(f2, 7, -5, 7, 5),
    n: makeWall(f2, 7, 5, -1, 5),
    w: makeWall(f2, -1, 5, -1, -5),
    hall: makeWall(f2, -1, 2, 4.8, 2),
    mid: makeWall(f2, 3.2, -5, 3.2, 2),
    bath: makeWall(f2, 1.6, 2, 1.6, 5),
    railVoid: makeWall(f2, 4.8, 2, 7, 2, { height: 1.05, thickness: 0.08 }),
  }
  elements.push(...Object.values(f2Walls))
  elements.push(
    open(f2Walls.s, 1, -5, { type: 'window', width: 1.3, height: 1.2, sill: 0.85 }),
    open(f2Walls.s, 5.2, -5, { type: 'window', width: 1.3, height: 1.2, sill: 0.85 }),
    open(f2Walls.w, -1, -1.5, { type: 'window', width: 1.2, height: 1.1, sill: 0.9 }),
    open(f2Walls.e, 7, -1.2, { type: 'window', width: 1.2, height: 1.1, sill: 0.9 }),
    open(f2Walls.n, -0.2, 5, { type: 'window', width: 0.6, height: 0.6, sill: 1.4 }),
    open(f2Walls.hall, 0.3, 2, { type: 'door', width: 0.75, height: 2.1 }),
    open(f2Walls.hall, 2.4, 2, { type: 'door', width: 0.8, height: 2.1 }),
    open(f2Walls.hall, 4, 2, { type: 'door', width: 0.8, height: 2.1 }),
  )

  elements.push(
    makeSlab(gf, -1, -5, 8, 10, 'tile-sand', 0.12),
    makeSlab(gf, 2.5, -8.2, 1.8, 3.2, 'concrete-floor', 0.1),
    makeSlab(f2, -1, -5, 8, 7, 'wood-floor', 0.12),
    makeSlab(f2, -1, 2, 5.8, 3, 'tile-white', 0.12),
    {
      id: uid('stair'),
      type: 'stair',
      levelId: gf.id,
      x: 4.8,
      z: 2,
      w: 2.2,
      d: 3,
      dir: 'z',
      steps: 18,
    },
    furnitureElement(gf, 'sofa', 1.6, -2.3),
    furnitureElement(gf, 'table', 1.7, -0.4),
    furnitureElement(gf, 'chair', 0.7, -0.2),
    furnitureElement(gf, 'chair', 2.6, -0.2),
    furnitureElement(gf, 'kitchen', 0.4, 3.5),
    furnitureElement(gf, 'plant', -3.1, -3.2),
    furnitureElement(gf, 'person', 3, -6.5),
    furnitureElement(f2, 'bed', 0.4, -1.6),
    furnitureElement(f2, 'bed', 5.1, -1.5),
    furnitureElement(f2, 'wardrobe', -0.35, 0.5),
    furnitureElement(f2, 'desk', 3.3, 3.5),
    furnitureElement(f2, 'chair', 3.3, 2.8),
    makeLabel(gf, 2, -2, 'ห้องนั่งเล่น'),
    makeLabel(gf, 0.8, 3.6, 'ครัว'),
    makeLabel(gf, 3.9, 4.3, 'ห้องน้ำ'),
    makeLabel(f2, 0.8, -1.4, 'ห้องนอน 1'),
    makeLabel(f2, 5, -1.4, 'ห้องนอน 2'),
    makeLabel(f2, 0.2, 3.5, 'ห้องน้ำ'),
    makeLabel(f2, 3.2, 3.5, 'โถง'),
  )

  const y1 = ceilingY(gf, 'ceiling')
  const y2 = ceilingY(f2, 'ceiling')
  elements.push(
    conduit(gf, [
      { x: 2, y: y1, z: -2 },
      { x: 2, y: y1, z: 1.2 },
      { x: 0.6, y: y1, z: 3.5 },
    ]),
    conduit(gf, [
      { x: 3, y: y1, z: -4.2 },
      { x: 3.15, y: 1.2, z: -4.72 },
    ]),
    conduit(f2, [
      { x: 0.2, y: y2, z: -1.6 },
      { x: 5, y: y2, z: -1.6 },
      { x: 3.2, y: y2, z: 3.4 },
    ]),
    light(gf, 2, y1 - 0.05, -2),
    light(gf, 0.8, y1 - 0.05, 3.5),
    light(f2, 0.6, y2 - 0.05, -1.6),
    light(f2, 5, y2 - 0.05, -1.5),
    light(f2, 3.2, y2 - 0.05, 3.4),
    device(gf, 'switch', 3.15, 1.2, -4.78, Math.PI / 2),
    device(gf, 'outlet', 0.2, 0.35, -4.78, Math.PI / 2),
    device(gf, 'outlet', -0.78, 0.35, 3.2, Math.PI),
    device(f2, 'switch', 2.5, f2.elevation + 1.2, 2.08, 0),
    device(f2, 'outlet', 0.2, f2.elevation + 0.35, -4.78, Math.PI / 2),
    junction(gf, 2, y1, 1.2),
    junction(f2, 5, y2, -1.6),
  )

  project.elements = elements
  validateProject(project)
  return project
}

export function factoryProject() {
  const gf = { id: 'gf', name: 'ชั้นผลิต', elevation: 0, height: 7 }
  const project = base(
    'โรงงานผลิต — แบ่งโซนแล้ว',
    { width: 52, depth: 36 },
    [gf],
    [],
    { type: 'flat', pitch: 6, overhang: 1.2, material: 'roof-metal' },
    'steel',
  )
  const elements = []
  const xs = [-15, -9, -3, 3, 9, 15]
  const zs = [-9, -3, 3, 9]
  for (const x of xs) for (const z of zs) {
    elements.push(makeColumn(gf, x, z, 'steel', 0.22))
    elements.push(engineeringElement(gf, 'pile', { x, z, h: 18 }))
    elements.push(engineeringElement(gf, 'pad', { x, z, w: 1.5, d: 1.5, h: 0.5 }))
  }
  for (const z of zs) {
    for (let i = 0; i < xs.length - 1; i += 1) elements.push(makeBeam(project, gf, xs[i], z, xs[i + 1], z))
  }
  for (const x of xs) {
    for (let i = 0; i < zs.length - 1; i += 1) elements.push(makeBeam(project, gf, x, zs[i], x, zs[i + 1]))
  }

  const walls = {
    frontGlass: makeWall(gf, -15, -9, -9, -9, { finish: 'glass', thickness: 0.08 }),
    front: makeWall(gf, -9, -9, 15, -9, { finish: 'panel', thickness: 0.12 }),
    east: makeWall(gf, 15, -9, 15, 9, { finish: 'panel', thickness: 0.12 }),
    north: makeWall(gf, 15, 9, -15, 9, { finish: 'panel', thickness: 0.12 }),
    west: makeWall(gf, -15, 9, -15, -9, { finish: 'panel', thickness: 0.12 }),
    office: makeWall(gf, -15, -3, -9, -3, { finish: 'glass', thickness: 0.08, height: 3.2 }),
    officeSide: makeWall(gf, -9, -9, -9, -3, { finish: 'glass', thickness: 0.08, height: 3.2 }),
    whX: makeWall(gf, 6, -9, 6, -2, { finish: 'panel', thickness: 0.1, height: 4 }),
    whZ: makeWall(gf, 6, -2, 15, -2, { finish: 'panel', thickness: 0.1, height: 4 }),
    qcX: makeWall(gf, -3, 3, -3, 9, { finish: 'plaster', height: 3.2 }),
    qcZ: makeWall(gf, -9, 3, -3, 3, { finish: 'plaster', height: 3.2 }),
  }
  elements.push(...Object.values(walls))
  elements.push(
    open(walls.front, 2, -9, { type: 'door', width: 4, height: 4.2 }),
    open(walls.frontGlass, -12, -9, { type: 'door', width: 0.9, height: 2.2 }),
    open(walls.office, -12, -3, { type: 'door', width: 0.9, height: 2.1 }),
    open(walls.whX, 6, -5.5, { type: 'door', width: 1.6, height: 2.4 }),
    open(walls.qcZ, -6, 3, { type: 'door', width: 0.9, height: 2.1 }),
    open(walls.east, 15, 1, { type: 'window', width: 2.4, height: 1.4, sill: 2.2 }),
  )

  elements.push(
    makeSlab(gf, -15, -9, 6, 6, 'tile-white', 0.15),
    makeSlab(gf, -15, -3, 6, 12, 'epoxy', 0.15),
    makeSlab(gf, -9, -9, 24, 18, 'epoxy', 0.15),
    engineeringElement(gf, 'raft', { x: 3, z: 0, w: 24, d: 18 }),
    engineeringElement(gf, 'machine-pad', { x: -2, z: 1 }),
    engineeringElement(gf, 'machine-pad', { x: 4, z: 2.2 }),
    engineeringElement(gf, 'machine-pad', { x: 9, z: 0.4 }),
    furnitureElement(gf, 'machine', -2, 1),
    furnitureElement(gf, 'machine', 4, 2.2),
    furnitureElement(gf, 'machine', 9, 0.4),
    furnitureElement(gf, 'shelf', 11, -6),
    furnitureElement(gf, 'shelf', 13.2, -6),
    furnitureElement(gf, 'desk', -13, -6.6),
    furnitureElement(gf, 'desk', -11.2, -5),
    furnitureElement(gf, 'chair', -13, -5.8),
    furnitureElement(gf, 'chair', -11.2, -4.2),
    furnitureElement(gf, 'person', -12, -10.2),
    makeLabel(gf, 2, 2, 'โซนผลิต'),
    makeLabel(gf, -12, -6, 'สำนักงาน'),
    makeLabel(gf, 11, -5.5, 'คลังสินค้า'),
    makeLabel(gf, -6, 6, 'ตรวจคุณภาพ'),
  )

  const y = ceilingY(gf, 'ceiling')
  elements.push(
    conduit(gf, [
      { x: -14, y, z: 0 },
      { x: 0, y, z: 0 },
      { x: 14, y, z: 0 },
    ]),
    conduit(gf, [
      { x: 2, y, z: 0 },
      { x: 2, y: 1.2, z: -8.2 },
    ]),
    light(gf, -12, y - 0.2, -6),
    light(gf, -6, y - 0.2, 0),
    light(gf, 0, y - 0.2, 0),
    light(gf, 6, y - 0.2, 0),
    light(gf, 12, y - 0.2, 0),
    device(gf, 'switch', 2, 1.2, -8.85, Math.PI / 2),
    device(gf, 'outlet', -12, 0.4, -8.85, Math.PI / 2),
    device(gf, 'outlet', 10, 0.4, -1.9, 0),
    junction(gf, 0, y, 0),
    junction(gf, 2, y, 0),
  )
  project.elements = elements
  validateProject(project)
  return project
}

export function projectFromTemplate(id) {
  if (id === 'house') return houseProject()
  if (id === 'factory') return factoryProject()
  return emptyProject()
}

export function validateProject(project) {
  const ids = new Set(project.elements.map((element) => element.id))
  for (const element of project.elements) {
    if ((element.type === 'door' || element.type === 'window') && !ids.has(element.wallId)) {
      throw new Error(`ไม่พบผนังของช่องเปิด ${element.id}`)
    }
    if (element.type === 'door' || element.type === 'window') {
      const wall = project.elements.find((item) => item.id === element.wallId)
      const length = wallLength(wall)
      const center = element.t * length
      if (center - element.width / 2 < -0.05 || center + element.width / 2 > length + 0.05) {
        throw new Error(`ช่องเปิดเลยผนัง ${wall.id}`)
      }
    }
    if (element.type === 'conduit' && (element.points?.length ?? 0) < 2) {
      throw new Error('แนวท่อสั้นเกินไป')
    }
  }
  for (let i = 1; i < project.levels.length; i += 1) {
    const prev = project.levels[i - 1]
    const current = project.levels[i]
    if (Math.abs(current.elevation - (prev.elevation + prev.height)) > 0.02) {
      throw new Error('ระดับชั้นไม่ต่อกัน')
    }
  }
}

function base(name, site, levels, elements, roof, structureMaterial) {
  return {
    name,
    site,
    levels,
    activeLevelId: levels[0].id,
    roof,
    autoStructure: true,
    structureMaterial,
    waste: 0.05,
    paintSides: 2,
    rates: { ...DEFAULT_RATES },
    elements,
  }
}

function open(wall, x, z, spec) {
  const opening = placeOpening(wall, x, z, spec)
  if (!opening) throw new Error(`วางช่องเปิดบนผนังไม่ได้ ${wall.id}`)
  return opening
}

function conduit(level, points) {
  return { id: uid('pipe'), type: 'conduit', levelId: level.id, points }
}

function light(level, x, y, z) {
  return { id: uid('lamp'), type: 'light', levelId: level.id, x, y, z }
}

function device(level, kind, x, y, z, rot) {
  return { id: uid(kind), type: 'device', levelId: level.id, kind, x, y, z, rot }
}

function junction(level, x, y, z) {
  return { id: uid('box'), type: 'junction', levelId: level.id, x, y, z }
}

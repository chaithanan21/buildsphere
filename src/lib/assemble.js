import { ENGINEERING, FURNITURE } from './catalog.js'
import { normalizeRect, wallLength } from './geometry.js'
import { uid } from './ids.js'

const BEAM_DROP = 0.35

export function elementsFromDraw(project, tool, a, b, extra = {}) {
  const level = project.levels.find((item) => item.id === project.activeLevelId) || project.levels[0]
  if (tool === 'room') return roomAssembly(project, level, normalizeRect(a, b))
  if (tool === 'slab') return slabFromRect(level, normalizeRect(a, b), extra.finish || 'tile-sand')
  if (tool === 'wall') return [makeWall(level, a.x, a.z, b.x, b.z)]
  if (tool === 'beam') return [makeBeam(project, level, a.x, a.z, b.x, b.z)]
  if (tool === 'stair') return stairFromRect(level, normalizeRect(a, b))
  if (tool === 'engineering') return engineeringFromDraw(level, extra.kind, a, b)
  return []
}

export function roomAssembly(project, level, rect) {
  if (rect.w < 1.2 || rect.d < 1.2) return []
  const { x, z, w, d } = rect
  const material = project.structureMaterial || 'concrete'
  const elements = [
    makeWall(level, x, z, x + w, z),
    makeWall(level, x + w, z, x + w, z + d),
    makeWall(level, x + w, z + d, x, z + d),
    makeWall(level, x, z + d, x, z),
    makeSlab(level, x, z, w, d, 'tile-sand'),
    makeLabel(level, x + w / 2, z + d / 2, 'พื้นที่'),
  ]
  if (project.autoStructure !== false) {
    const xs = gridStops(x, x + w)
    const zs = gridStops(z, z + d)
    for (const cx of xs) {
      for (const cz of zs) elements.push(makeColumn(level, cx, cz, material))
    }
    for (const cz of zs) {
      for (let i = 0; i < xs.length - 1; i += 1) elements.push(makeBeam(project, level, xs[i], cz, xs[i + 1], cz))
    }
    for (const cx of xs) {
      for (let i = 0; i < zs.length - 1; i += 1) elements.push(makeBeam(project, level, cx, zs[i], cx, zs[i + 1]))
    }
  }
  return elements
}

function gridStops(start, end) {
  const stops = [start]
  const span = end - start
  if (span > 4.6) {
    const parts = Math.round(span / 4)
    for (let i = 1; i < parts; i += 1) stops.push(start + (span * i) / parts)
  }
  stops.push(end)
  return stops
}

export function makeWall(level, x1, z1, x2, z2, extra = {}) {
  return {
    id: uid('wall'),
    type: 'wall',
    levelId: level.id,
    x1,
    z1,
    x2,
    z2,
    thickness: extra.thickness ?? 0.15,
    height: extra.height ?? Math.max(1, level.height - BEAM_DROP),
    finish: extra.finish ?? 'plaster',
  }
}

export function makeSlab(level, x, z, w, d, finish = 'tile-sand', thickness = 0.12) {
  return {
    id: uid('slab'),
    type: 'slab',
    levelId: level.id,
    x,
    z,
    w,
    d,
    thickness,
    finish,
  }
}

export function makeColumn(level, x, z, material = 'concrete', size = 0.25) {
  return {
    id: uid('col'),
    type: 'column',
    levelId: level.id,
    x,
    z,
    w: size,
    d: size,
    material,
  }
}

export function makeBeam(project, level, x1, z1, x2, z2) {
  const material = project.structureMaterial || 'concrete'
  const steel = material === 'steel'
  return {
    id: uid('beam'),
    type: 'beam',
    levelId: level.id,
    x1,
    z1,
    x2,
    z2,
    w: steel ? 0.16 : 0.22,
    h: steel ? 0.4 : BEAM_DROP,
    material,
  }
}

export function makeLabel(level, x, z, text) {
  return { id: uid('label'), type: 'label', levelId: level.id, x, z, text }
}

function slabFromRect(level, rect, finish) {
  if (rect.w < 0.8 || rect.d < 0.8) return []
  return [makeSlab(level, rect.x, rect.z, rect.w, rect.d, finish)]
}

function stairFromRect(level, rect) {
  if (rect.w < 0.8 || rect.d < 1.2) return []
  const dir = rect.d >= rect.w ? 'z' : 'x'
  const run = dir === 'z' ? rect.d : rect.w
  const steps = Math.max(8, Math.round(level.height / 0.175))
  if (run < 1.2) return []
  return [
    {
      id: uid('stair'),
      type: 'stair',
      levelId: level.id,
      x: rect.x,
      z: rect.z,
      w: rect.w,
      d: rect.d,
      dir,
      steps,
    },
  ]
}

export function placeOpening(wall, x, z, spec) {
  const length = wallLength(wall)
  if (length < 0.4) return null
  const dx = wall.x2 - wall.x1
  const dz = wall.z2 - wall.z1
  const along = ((x - wall.x1) * dx + (z - wall.z1) * dz) / length
  const half = spec.width / 2
  const center = Math.min(length - half - 0.05, Math.max(half + 0.05, along))
  if (length < spec.width + 0.12) return null
  return {
    id: uid(spec.type),
    type: spec.type,
    levelId: wall.levelId,
    wallId: wall.id,
    t: center / length,
    width: spec.width,
    height: spec.height,
    sill: spec.sill ?? 0,
  }
}

export function furnitureElement(level, kind, x, z) {
  const spec = FURNITURE[kind] || FURNITURE.table
  return {
    id: uid('furn'),
    type: 'furniture',
    levelId: level.id,
    kind,
    x,
    z,
    rot: 0,
    w: spec.w,
    d: spec.d,
    h: spec.h,
  }
}

export function engineeringElement(level, kind, fields = {}) {
  const spec = ENGINEERING[kind]
  if (!spec) return null
  return {
    id: uid('eng'),
    type: 'engineering',
    levelId: level.id,
    kind,
    rot: 0,
    w: spec.w,
    d: spec.d,
    h: spec.h,
    ...fields,
  }
}

export function engineeringFromDraw(level, kind, a, b) {
  const spec = ENGINEERING[kind]
  if (!spec || spec.mode === 'point') return []
  if (spec.mode === 'rect') {
    const rect = normalizeRect(a, b)
    if (rect.w < 0.6 || rect.d < 0.6) return []
    return [engineeringElement(level, kind, {
      x: rect.x + rect.w / 2,
      z: rect.z + rect.d / 2,
      w: rect.w,
      d: rect.d,
      h: spec.h,
    })]
  }
  if (Math.hypot(b.x - a.x, b.z - a.z) < 0.6) return []
  return [engineeringElement(level, kind, {
    x1: a.x,
    z1: a.z,
    x2: b.x,
    z2: b.z,
    w: spec.w,
    h: spec.h,
  })]
}

export function ceilingY(level, mode) {
  if (mode === 'switch') return level.elevation + 1.2
  if (mode === 'outlet') return level.elevation + 0.35
  return level.elevation + level.height - 0.28
}

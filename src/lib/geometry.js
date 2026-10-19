export function snap(value, step = 0.25) {
  return Math.round(value / step) * step
}

export function snapPoint(point, step = 0.25) {
  return { x: snap(point.x, step), z: snap(point.z, step) }
}

export function dist2(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1)
}

export function dist3(a, b) {
  return Math.hypot(b.x - a.x, (b.y ?? 0) - (a.y ?? 0), b.z - a.z)
}

export function wallLength(wall) {
  return dist2(wall.x1, wall.z1, wall.x2, wall.z2)
}

export function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x)
  const z = Math.min(a.z, b.z)
  return { x, z, w: Math.abs(b.x - a.x), d: Math.abs(b.z - a.z) }
}

export function pointSegmentDistance(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1
  const dz = z2 - z1
  const len2 = dx * dx + dz * dz
  if (len2 < 1e-8) return Math.hypot(px - x1, pz - z1)
  let t = ((px - x1) * dx + (pz - z1) * dz) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + dx * t), pz - (z1 + dz * t))
}

export function alongWall(wall, x, z) {
  const dx = wall.x2 - wall.x1
  const dz = wall.z2 - wall.z1
  const len = Math.hypot(dx, dz) || 1
  return ((x - wall.x1) * dx + (z - wall.z1) * dz) / len
}

export function wallYaw(wall) {
  return Math.atan2(wall.x2 - wall.x1, wall.z2 - wall.z1)
}

export function sameEdge(a, b, tolerance = 0.08) {
  const d1 = dist2(a.x1, a.z1, b.x1, b.z1) + dist2(a.x2, a.z2, b.x2, b.z2)
  const d2 = dist2(a.x1, a.z1, b.x2, b.z2) + dist2(a.x2, a.z2, b.x1, b.z1)
  return Math.min(d1, d2) < tolerance * 2
}

export function buildingBounds(elements) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let found = false
  for (const el of elements) {
    if (el.type !== 'wall' && el.type !== 'column' && el.type !== 'slab') continue
    found = true
    if (el.type === 'slab') {
      minX = Math.min(minX, el.x)
      maxX = Math.max(maxX, el.x + el.w)
      minZ = Math.min(minZ, el.z)
      maxZ = Math.max(maxZ, el.z + el.d)
    } else if (el.type === 'column') {
      minX = Math.min(minX, el.x)
      maxX = Math.max(maxX, el.x)
      minZ = Math.min(minZ, el.z)
      maxZ = Math.max(maxZ, el.z)
    } else {
      minX = Math.min(minX, el.x1, el.x2)
      maxX = Math.max(maxX, el.x1, el.x2)
      minZ = Math.min(minZ, el.z1, el.z2)
      maxZ = Math.max(maxZ, el.z1, el.z2)
    }
  }
  if (!found) return null
  return { minX, maxX, minZ, maxZ }
}

export function roofBaseY(project) {
  let y = 0
  for (const level of project.levels) {
    const used = project.elements.some(
      (el) => el.levelId === level.id && (el.type === 'wall' || el.type === 'column' || el.type === 'slab'),
    )
    if (used) y = Math.max(y, level.elevation + level.height)
  }
  return y
}

export function roofMetrics(bounds, roof) {
  if (!bounds || !roof || roof.type === 'none') return { plan: 0, surface: 0 }
  const overhang = roof.overhang ?? 0
  const width = bounds.maxX - bounds.minX + overhang * 2
  const depth = bounds.maxZ - bounds.minZ + overhang * 2
  const plan = Math.max(0, width * depth)
  if (roof.type === 'flat') return { plan, surface: plan }
  const pitch = ((roof.pitch ?? 30) * Math.PI) / 180
  const ridgeAlongX = width >= depth
  const span = ridgeAlongX ? depth : width
  const slope = span / 2 / Math.cos(pitch)
  const surface = (ridgeAlongX ? width : depth) * slope * 2
  return { plan, surface }
}

export function levelById(project, id) {
  return project.levels.find((level) => level.id === id) || project.levels[0]
}

export function nextLevel(project, level) {
  const index = project.levels.findIndex((item) => item.id === level.id)
  return project.levels[index + 1] || null
}

export function polylineLength(points) {
  let length = 0
  for (let i = 1; i < points.length; i += 1) length += dist3(points[i - 1], points[i])
  return length
}

export function elbowCount(points) {
  let count = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = direction(points[i - 1], points[i])
    const b = direction(points[i], points[i + 1])
    const dot = a.x * b.x + a.y * b.y + a.z * b.z
    if (dot < 0.92) count += 1
  }
  return count
}

function direction(a, b) {
  const x = b.x - a.x
  const y = (b.y ?? 0) - (a.y ?? 0)
  const z = b.z - a.z
  const length = Math.hypot(x, y, z) || 1
  return { x: x / length, y: y / length, z: z / length }
}

export function focusOf(project) {
  const bounds = buildingBounds(project.elements)
  if (!bounds) {
    return {
      x: 0,
      y: 0,
      z: 0,
      span: Math.max(project.site.width, project.site.depth) * 0.55,
      top: 0,
    }
  }
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: 1.2,
    z: (bounds.minZ + bounds.maxZ) / 2,
    span: Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 6),
    top: roofBaseY(project),
  }
}

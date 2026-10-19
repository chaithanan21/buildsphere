import { dist2 } from './geometry.js'

export function buildWalkPath(project) {
  const points = []
  const levels = project.levels
  const ground = levels[0]
  const slabs = project.elements.filter((el) => el.type === 'slab' && el.levelId === ground.id)
  if (!slabs.length) return points

  const main = slabs.reduce((best, slab) => (slab.w * slab.d > best.w * best.d ? slab : best), slabs[0])
  const door = entranceDoor(project, ground.id)
  const eye = ground.elevation + 1.65

  if (door) {
    const at = pointOnWall(door.wall, door.opening.t)
    const inside = inward(door.wall, at, slabCenter(main))
    points.push({ x: at.x - inside.x * 1.3, y: eye, z: at.z - inside.z * 1.3 })
    points.push({ x: at.x + inside.x * 0.9, y: eye, z: at.z + inside.z * 0.9 })
  }

  points.push(...rectLoop(main, eye))

  const stair = project.elements.find((el) => el.type === 'stair' && el.levelId === ground.id)
  const upper = levels[1]
  if (stair && upper) {
    const samples = 8
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples
      const x = stair.dir === 'x' ? stair.x + t * stair.w : stair.x + stair.w / 2
      const z = stair.dir === 'z' ? stair.z + t * stair.d : stair.z + stair.d / 2
      points.push({
        x,
        y: ground.elevation + t * (upper.elevation - ground.elevation) + 1.65,
        z,
      })
    }
    const upperSlabs = project.elements.filter((el) => el.type === 'slab' && el.levelId === upper.id)
    for (const slab of upperSlabs) {
      points.push({ x: slab.x + Math.min(1.4, slab.w / 2), y: upper.elevation + 1.65, z: slab.z + slab.d / 2 })
    }
  }

  return dedupe(points)
}

function entranceDoor(project, levelId) {
  const doors = project.elements.filter((el) => el.type === 'door' && el.levelId === levelId)
  for (const opening of doors) {
    const wall = project.elements.find((el) => el.id === opening.wallId)
    if (wall) return { wall, opening }
  }
  return null
}

function pointOnWall(wall, t) {
  return {
    x: wall.x1 + (wall.x2 - wall.x1) * t,
    z: wall.z1 + (wall.z2 - wall.z1) * t,
  }
}

function slabCenter(slab) {
  return { x: slab.x + slab.w / 2, z: slab.z + slab.d / 2 }
}

function inward(wall, at, target) {
  const len = dist2(wall.x1, wall.z1, wall.x2, wall.z2) || 1
  let x = -(wall.z2 - wall.z1) / len
  let z = (wall.x2 - wall.x1) / len
  const dot = x * (target.x - at.x) + z * (target.z - at.z)
  if (dot < 0) {
    x = -x
    z = -z
  }
  return { x, z }
}

function rectLoop(slab, y) {
  const m = Math.min(1.3, slab.w * 0.2, slab.d * 0.2)
  const x0 = slab.x + m
  const x1 = slab.x + slab.w - m
  const z0 = slab.z + m
  const z1 = slab.z + slab.d - m
  if (x1 - x0 < 0.8 || z1 - z0 < 0.8) return [{ x: slab.x + slab.w / 2, y, z: slab.z + slab.d / 2 }]
  return [
    { x: x0, y, z: z0 },
    { x: x1, y, z: z0 },
    { x: x1, y, z: z1 },
    { x: x0, y, z: z1 },
  ]
}

function dedupe(points) {
  const out = []
  for (const point of points) {
    const prev = out[out.length - 1]
    if (!prev || dist2(prev.x, prev.z, point.x, point.z) > 0.45 || Math.abs(prev.y - point.y) > 0.2) out.push(point)
  }
  return out
}

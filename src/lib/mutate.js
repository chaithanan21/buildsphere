import { uid } from './ids.js'
import { dist2, sameEdge } from './geometry.js'

export function addElements(project, elements) {
  const fresh = []
  for (const element of elements) {
    if (element.type === 'wall') {
      const duplicate = project.elements.some(
        (wall) => wall.type === 'wall' && wall.levelId === element.levelId && sameEdge(wall, element),
      )
      if (duplicate) continue
    }
    if (element.type === 'column') {
      const duplicate = project.elements.some(
        (column) =>
          column.type === 'column' &&
          column.levelId === element.levelId &&
          dist2(column.x, column.z, element.x, element.z) < 0.3,
      )
      if (duplicate) continue
    }
    fresh.push(element)
  }
  project.elements.push(...fresh)
  return fresh.length
}

export function patchElement(project, id, data) {
  if (id === 'roof') {
    Object.assign(project.roof, data)
    return
  }
  const element = project.elements.find((item) => item.id === id)
  if (element) Object.assign(element, data)
}

export function removeElements(project, ids) {
  const set = new Set(ids)
  if (set.has('roof')) project.roof.type = 'none'
  project.elements = project.elements.filter((element) => !set.has(element.id) && !set.has(element.wallId))
}

export function pasteElement(project, source, offset = 0.5) {
  if (!source || source.type === 'door' || source.type === 'window') return null
  const copy = structuredClone(source)
  copy.id = uid(source.type || 'copy')
  if (typeof copy.x === 'number') copy.x += offset
  if (typeof copy.z === 'number') copy.z += offset
  if (typeof copy.x1 === 'number') {
    copy.x1 += offset
    copy.x2 += offset
  }
  if (typeof copy.z1 === 'number') {
    copy.z1 += offset
    copy.z2 += offset
  }
  if (copy.points) {
    copy.points = copy.points.map((point) => ({ ...point, x: point.x + offset, z: point.z + offset }))
  }
  return addElements(project, [copy]) ? copy.id : null
}

export function duplicateElement(project, id) {
  const element = project.elements.find((item) => item.id === id)
  if (!element || element.type === 'door' || element.type === 'window') return null
  const copy = structuredClone(element)
  copy.id = uid(element.type)
  if (typeof copy.x === 'number') copy.x += 0.5
  if (typeof copy.z === 'number') copy.z += 0.5
  if (typeof copy.x1 === 'number') {
    copy.x1 += 0.5
    copy.x2 += 0.5
  }
  if (copy.points) {
    copy.points = copy.points.map((point) => ({ ...point, x: point.x + 0.5 }))
  }
  project.elements.push(copy)
  return copy.id
}

export function reflowLevels(project, oldElevation) {
  let y = 0
  for (const level of project.levels) {
    const delta = y - (oldElevation.get(level.id) ?? y)
    level.elevation = y
    if (Math.abs(delta) > 1e-6) shiftLevel(project, level.id, delta)
    y += level.height
  }
}

function shiftLevel(project, levelId, delta) {
  for (const element of project.elements) {
    if (element.levelId !== levelId) continue
    if (typeof element.y === 'number') element.y += delta
    if (element.points) {
      for (const point of element.points) point.y += delta
    }
  }
}

export function setLevelHeight(project, id, height) {
  const level = project.levels.find((item) => item.id === id)
  if (!level) return
  const oldHeight = level.height
  const oldElevation = new Map(project.levels.map((item) => [item.id, item.elevation]))
  level.height = Math.max(2.4, Number(height) || oldHeight)
  const previousWall = oldHeight - 0.35
  for (const element of project.elements) {
    if (element.levelId === id && element.type === 'wall' && Math.abs(element.height - previousWall) < 0.08) {
      element.height = level.height - 0.35
    }
  }
  reflowLevels(project, oldElevation)
}

export function addLevel(project) {
  const top = project.levels[project.levels.length - 1]
  const id = uid('lv')
  project.levels.push({
    id,
    name: `ชั้น ${project.levels.length + 1}`,
    elevation: top.elevation + top.height,
    height: top.height,
  })
  project.activeLevelId = id
  return id
}

export function removeLevel(project, id) {
  if (project.levels.length < 2) return
  const oldElevation = new Map(project.levels.map((item) => [item.id, item.elevation]))
  project.levels = project.levels.filter((level) => level.id !== id)
  project.elements = project.elements.filter((element) => element.levelId !== id)
  if (!project.levels.some((level) => level.id === project.activeLevelId)) {
    project.activeLevelId = project.levels[0].id
  }
  reflowLevels(project, oldElevation)
}

export function applyFinish(project, target, materialId) {
  if (!target) return
  if (target.type === 'roof') {
    project.roof.material = materialId
    return
  }
  const element = project.elements.find((item) => item.id === target.id)
  if (!element) return
  if (element.type === 'wall' || element.type === 'slab') element.finish = materialId
}

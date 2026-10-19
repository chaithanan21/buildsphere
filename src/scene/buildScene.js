import * as THREE from 'three'
import { ENGINEERING } from '../lib/catalog.js'
import { levelById, roofBaseY, wallLength, wallYaw } from '../lib/geometry.js'
import { disposeOwned, materialFor, sharedMaterial, structureMaterial } from './materials.js'

const pvc = () => sharedMaterial('pvc', { color: '#e2b008', roughness: 0.45, metalness: 0.08 })
const wood = () => sharedMaterial('wood-trim', { color: '#8d5b3c', roughness: 0.7, metalness: 0 })
const glass = () => sharedMaterial('glass-pane', { color: '#d5eaf1', roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.45, depthWrite: false })
const fabric = () => sharedMaterial('fabric', { color: '#3e5c56', roughness: 0.92, metalness: 0 })
const fabricDeep = () => sharedMaterial('fabric-deep', { color: '#243833', roughness: 0.9, metalness: 0 })
const cloth = () => sharedMaterial('cloth', { color: '#d9d3c7', roughness: 0.95, metalness: 0 })
const metal = () => sharedMaterial('machine', { color: '#c5c9ce', roughness: 0.4, metalness: 0.45 })
const leaf = () => sharedMaterial('leaf', { color: '#4f7d45', roughness: 0.85, metalness: 0 })

export function buildContent(project) {
  const root = new THREE.Group()
  root.name = 'content'
  root.add(buildSite(project.site))

  for (const element of project.elements) {
    const level = levelById(project, element.levelId)
    const object = buildElement(project, element, level)
    if (object) root.add(object)
  }

  const roof = buildRoof(project)
  if (roof) root.add(roof)
  return root
}

export function clearContent(root) {
  disposeOwned(root)
  root.clear()
}

function buildSite(site) {
  const group = new THREE.Group()
  group.userData = { id: 'site', type: 'site' }
  const earth = new THREE.Mesh(
    new THREE.BoxGeometry(site.width + 1.2, 0.45, site.depth + 1.2),
    sharedMaterial('earth', { color: '#c4b49a', roughness: 1, metalness: 0 }),
  )
  earth.position.y = -0.28
  earth.receiveShadow = true
  earth.userData.cover = true
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(site.width, site.depth),
    sharedMaterial('grass', { color: '#86a56b', roughness: 1, metalness: 0 }),
  )
  grass.rotation.x = -Math.PI / 2
  grass.position.y = -0.01
  grass.receiveShadow = true
  grass.userData.cover = true
  const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(site.width, site.depth))
  const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: '#1f4d45' }))
  edge.rotation.x = -Math.PI / 2
  edge.position.y = 0.03
  edge.raycast = () => {}
  const cells = Math.max(8, Math.round(Math.max(site.width, site.depth)))
  const grid = new THREE.GridHelper(cells, cells, 0xb7aa96, 0xe0d8cc)
  grid.position.y = 0.02
  grid.raycast = () => {}
  group.add(earth, grass, edge, grid)
  return group
}

function buildElement(project, element, level) {
  switch (element.type) {
    case 'wall':
      return buildWall(element, level, project.elements)
    case 'slab':
      return buildSlab(element, level)
    case 'column':
      return buildColumn(element, level)
    case 'beam':
      return buildBeam(element, level)
    case 'stair':
      return buildStair(element, level, project)
    case 'engineering':
      return buildEngineering(element, level)
    case 'furniture':
      return buildFurniture(element, level)
    case 'label':
      return buildLabel(element, level)
    case 'conduit':
      return buildConduit(element)
    case 'light':
      return buildLight(element)
    case 'device':
      return buildDevice(element)
    case 'junction':
      return buildJunction(element)
    default:
      return null
  }
}

function engineeringMaterial(kind) {
  if (kind === 'sand') return sharedMaterial('eng-sand', { color: '#c6a36a', roughness: 1, metalness: 0 })
  if (kind === 'lean') return sharedMaterial('eng-lean', { color: '#d9d3c6', roughness: 0.95, metalness: 0 })
  if (kind === 'precast') return sharedMaterial('eng-precast', { color: '#b7b2a8', roughness: 0.82, metalness: 0.02 })
  if (kind === 'pile') return sharedMaterial('eng-pile', { color: '#8d8680', roughness: 0.7, metalness: 0.04 })
  return structureMaterial('concrete')
}

function buildEngineering(item, level) {
  const spec = ENGINEERING[item.kind] || ENGINEERING.pad
  const group = new THREE.Group()
  group.userData = { id: item.id, type: 'engineering', levelId: item.levelId }
  const mat = engineeringMaterial(item.kind)
  const yTop = level.elevation + 0.02
  const up = Boolean(spec.up)
  if (spec.mode === 'line') {
    const length = Math.max(0.2, Math.hypot((item.x2 || 0) - (item.x1 || 0), (item.z2 || 0) - (item.z1 || 0)))
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(item.w, item.h, length), mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.y = up ? level.elevation + item.h / 2 : yTop - item.h / 2
    group.position.set(((item.x1 || 0) + (item.x2 || 0)) / 2, 0, ((item.z1 || 0) + (item.z2 || 0)) / 2)
    group.rotation.y = Math.atan2((item.x2 || 0) - (item.x1 || 0), (item.z2 || 0) - (item.z1 || 0))
    group.add(mesh)
    return group
  }
  group.position.set(item.x, 0, item.z)
  group.rotation.y = item.rot || 0
  if (item.kind === 'pile') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(item.w / 2, item.w * 0.42, item.h, 12), mat)
    shaft.position.y = yTop - item.h / 2
    shaft.castShadow = true
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(item.w * 0.72, item.w * 0.72, 0.08, 16), mat)
    cap.position.y = yTop
    cap.castShadow = true
    group.add(shaft, cap)
    return group
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(item.w, item.h, item.d), mat)
  mesh.position.y = up ? level.elevation + item.h / 2 : yTop - item.h / 2
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  if (item.kind === 'precast') {
    const seamMat = sharedMaterial('eng-seam', { color: '#8a847c', roughness: 0.9, metalness: 0 })
    const seams = Math.max(2, Math.round(item.w / 0.6))
    for (let i = 1; i < seams; i += 1) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, Math.max(0.05, item.d * 0.96)), seamMat)
      seam.position.set(-item.w / 2 + (item.w * i) / seams, item.h / 2 + 0.004, 0)
      seam.raycast = () => {}
      mesh.add(seam)
    }
  }
  return group
}

function buildWall(wall, level, elements) {
  const length = wallLength(wall)
  if (length < 0.05) return null
  const group = new THREE.Group()
  group.position.set(wall.x1, level.elevation, wall.z1)
  group.rotation.y = wallYaw(wall)
  group.userData = { id: wall.id, type: 'wall', levelId: wall.levelId }
  const material = materialFor(wall.finish, length / 0.8, wall.height / 0.8)
  const openings = openingsFor(wall, elements, length)
  for (const part of wallParts(length, wall.height, openings)) {
    const height = part.y1 - part.y0
    const span = part.x1 - part.x0
    if (height < 0.02 || span < 0.02) continue
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.thickness, height, span), material)
    mesh.position.set(0, part.y0 + height / 2, part.x0 + span / 2)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  for (const opening of openings) addOpening(group, wall, opening)
  return group
}

function openingsFor(wall, elements, length) {
  return elements
    .filter((item) => (item.type === 'door' || item.type === 'window') && item.wallId === wall.id)
    .map((item) => {
      const center = item.t * length
      return {
        ...item,
        start: center - item.width / 2,
        end: center + item.width / 2,
        sill: item.type === 'door' ? 0 : item.sill || 0,
        top: (item.type === 'door' ? 0 : item.sill || 0) + item.height,
      }
    })
    .filter((item) => item.end > item.start)
}

function wallParts(length, height, openings) {
  const sorted = [...openings].sort((a, b) => a.start - b.start)
  const parts = []
  let cursor = 0
  for (const opening of sorted) {
    const start = Math.max(0, opening.start)
    const end = Math.min(length, opening.end)
    const sill = Math.max(0, Math.min(height, opening.sill))
    const top = Math.max(sill, Math.min(height, opening.top))
    if (start > cursor + 0.02) parts.push({ x0: cursor, x1: start, y0: 0, y1: height })
    if (sill > 0.02) parts.push({ x0: start, x1: end, y0: 0, y1: sill })
    if (top < height - 0.02) parts.push({ x0: start, x1: end, y0: top, y1: height })
    cursor = Math.max(cursor, end)
  }
  if (cursor < length - 0.02) parts.push({ x0: cursor, x1: length, y0: 0, y1: height })
  return parts
}

function addOpening(group, wall, opening) {
  const width = Math.max(0.2, opening.end - opening.start)
  const height = Math.max(0.2, opening.top - opening.sill)
  if (opening.type === 'door') {
    const pivot = new THREE.Group()
    pivot.position.set(wall.thickness / 2 + 0.02, opening.sill, opening.start + 0.04)
    pivot.rotation.y = -0.7
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.04, height - 0.08, width - 0.08), wood())
    leaf.position.set(0, height / 2, (width - 0.08) / 2)
    leaf.castShadow = true
    pivot.add(leaf)
    group.add(pivot)
    return
  }
  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.02, height - 0.08, width - 0.08), glass())
  pane.position.set(0, opening.sill + height / 2, (opening.start + opening.end) / 2)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(wall.thickness + 0.02, 0.06, width), wood())
  frame.position.set(0, opening.sill + 0.03, (opening.start + opening.end) / 2)
  group.add(pane, frame)
}

function buildSlab(slab, level) {
  const group = new THREE.Group()
  group.userData = { id: slab.id, type: 'slab', levelId: slab.levelId }
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(slab.w, slab.thickness, slab.d),
    structureMaterial('concrete'),
  )
  body.position.set(slab.x + slab.w / 2, level.elevation + slab.thickness / 2, slab.z + slab.d / 2)
  body.receiveShadow = true
  body.castShadow = true
  const finish = new THREE.Mesh(
    new THREE.BoxGeometry(slab.w * 0.996, 0.012, slab.d * 0.996),
    materialFor(slab.finish, slab.w / 0.7, slab.d / 0.7),
  )
  finish.position.set(slab.x + slab.w / 2, level.elevation + slab.thickness + 0.006, slab.z + slab.d / 2)
  finish.receiveShadow = true
  group.add(body, finish)
  return group
}

function buildColumn(column, level) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(column.w, level.height, column.d),
    structureMaterial(column.material),
  )
  mesh.position.set(column.x, level.elevation + level.height / 2, column.z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData = { id: column.id, type: 'column', levelId: column.levelId }
  return mesh
}

function buildBeam(beam, level) {
  const length = wallLength(beam)
  if (length < 0.05) return null
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(beam.w, beam.h, length), structureMaterial(beam.material))
  mesh.position.set((beam.x1 + beam.x2) / 2, level.elevation + level.height - beam.h / 2, (beam.z1 + beam.z2) / 2)
  mesh.rotation.y = wallYaw(beam)
  mesh.castShadow = true
  mesh.userData = { id: beam.id, type: 'beam', levelId: beam.levelId }
  return mesh
}

function buildStair(stair, level, project) {
  const group = new THREE.Group()
  group.userData = { id: stair.id, type: 'stair', levelId: stair.levelId }
  const index = project.levels.findIndex((item) => item.id === level.id)
  const next = project.levels[index + 1]
  const riseTotal = (next ? next.elevation : level.elevation + level.height) - level.elevation
  const steps = stair.steps
  const along = stair.dir === 'x' ? stair.w : stair.d
  const width = stair.dir === 'x' ? stair.d : stair.w
  const run = along / steps
  const material = structureMaterial('concrete')
  for (let i = 0; i < steps; i += 1) {
    const height = (riseTotal * (i + 1)) / steps
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(stair.dir === 'x' ? run : width, height, stair.dir === 'x' ? width : run), material)
    if (stair.dir === 'x') mesh.position.set(i * run + run / 2, height / 2, width / 2)
    else mesh.position.set(width / 2, height / 2, i * run + run / 2)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  group.position.set(stair.x, level.elevation, stair.z)
  return group
}

function buildFurniture(item, level) {
  const group = new THREE.Group()
  group.userData = { id: item.id, type: 'furniture', levelId: item.levelId }
  group.position.set(item.x, level.elevation + 0.12, item.z)
  group.rotation.y = item.rot || 0
  const { w, d, h, kind } = item
  if (kind === 'sofa') addSofa(group, w, d, h)
  else if (kind === 'bed') addBed(group, w, d, h)
  else if (kind === 'chair') addChair(group, w, d, h)
  else if (kind === 'wardrobe' || kind === 'shelf') addCabinet(group, w, d, h, kind === 'shelf')
  else if (kind === 'kitchen') addKitchen(group, w, d, h)
  else if (kind === 'plant') addPlant(group, w, d, h)
  else if (kind === 'machine') addMachine(group, w, d, h)
  else if (kind === 'person') addPerson(group, w, d, h)
  else if (kind === 'desk') addDesk(group, w, d, h, true)
  else addDesk(group, w, d, h, false)
  return group
}

function addBox(parent, w, h, d, x, y, z, material, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = shadow
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addSofa(group, w, d, h) {
  addBox(group, w, h * 0.42, d * 0.78, 0, h * 0.28, d * 0.06, fabric())
  addBox(group, w, h * 0.55, d * 0.18, 0, h * 0.58, -d / 2 + d * 0.1, fabricDeep())
  addBox(group, w * 0.08, h * 0.42, d * 0.72, -w / 2 + w * 0.08, h * 0.5, d * 0.08, fabricDeep())
  addBox(group, w * 0.08, h * 0.42, d * 0.72, w / 2 - w * 0.08, h * 0.5, d * 0.08, fabricDeep())
}

function addBed(group, w, d, h) {
  addBox(group, w, h * 0.45, d, 0, h * 0.28, 0, cloth())
  addBox(group, w, h * 0.7, 0.08, 0, h * 0.55, -d / 2 + 0.05, wood())
}

function addChair(group, w, d, h) {
  const seat = h * 0.5
  addBox(group, w * 0.9, h * 0.07, d * 0.9, 0, seat, 0, wood())
  addBox(group, w * 0.86, h * 0.42, d * 0.08, 0, seat + h * 0.24, -d / 2 + d * 0.06, wood())
  const leg = Math.min(w, d) * 0.1
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(group, leg, seat, leg, x * w * 0.35, seat / 2, z * d * 0.35, wood())
  }
}

function addDesk(group, w, d, h, withScreen) {
  addBox(group, w, 0.05, d, 0, h - 0.04, 0, wood())
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(group, 0.06, h - 0.05, 0.06, x * (w / 2 - 0.06), (h - 0.05) / 2, z * (d / 2 - 0.06), wood())
  }
  if (withScreen) addBox(group, w * 0.35, 0.28, 0.04, 0, h + 0.16, -d * 0.2, sharedMaterial('screen', { color: '#24343a', roughness: 0.3, metalness: 0.2 }))
}

function addCabinet(group, w, d, h, open) {
  if (!open) {
    addBox(group, w, h, d, 0, h / 2, 0, wood())
    return
  }
  addBox(group, w, 0.04, d, 0, 0.08, 0, wood())
  addBox(group, 0.04, h, d, -w / 2, h / 2, 0, wood())
  addBox(group, 0.04, h, d, w / 2, h / 2, 0, wood())
  for (let i = 1; i <= 4; i += 1) addBox(group, w, 0.04, d, 0, (h * i) / 4, 0, wood())
}

function addKitchen(group, w, d, h) {
  addBox(group, w, h * 0.86, d, 0, h * 0.43, 0, sharedMaterial('cabinet', { color: '#f4f1ea', roughness: 0.8, metalness: 0 }))
  addBox(group, w, 0.05, d, 0, h - 0.03, 0, sharedMaterial('counter', { color: '#4d5554', roughness: 0.35, metalness: 0.1 }))
}

function addPlant(group, w, d, h) {
  const stem = Math.min(w, d) * 0.18
  addBox(group, stem, h * 0.45, stem, 0, h * 0.22, 0, wood(), false)
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), leaf())
  crown.scale.set(w * 0.42, h * 0.28, d * 0.42)
  crown.position.y = h * 0.62
  crown.castShadow = true
  group.add(crown)
}

function addMachine(group, w, d, h) {
  addBox(group, w, h * 0.72, d, 0, h * 0.4, 0, metal())
  addBox(group, w * 0.92, h * 0.08, d * 0.2, 0, h * 0.62, d * 0.2, pvc())
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.22, d * 0.22, w * 0.55, 16), metal())
  drum.rotation.z = Math.PI / 2
  drum.position.set(0, h * 0.86, 0)
  drum.castShadow = true
  group.add(drum)
}

function addPerson(group, w, d, h) {
  const skin = sharedMaterial('skin', { color: '#e0b394', roughness: 0.7, metalness: 0 })
  const shirt = sharedMaterial('shirt', { color: '#1f4d45', roughness: 0.8, metalness: 0 })
  const pants = sharedMaterial('pants', { color: '#2c3138', roughness: 0.85, metalness: 0 })
  addBox(group, w * 0.62, h * 0.42, d * 0.5, 0, h * 0.62, 0, shirt)
  addBox(group, w * 0.22, h * 0.42, d * 0.32, -w * 0.16, h * 0.22, 0, pants)
  addBox(group, w * 0.22, h * 0.42, d * 0.32, w * 0.16, h * 0.22, 0, pants)
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin)
  head.scale.set(w * 0.22, h * 0.075, d * 0.34)
  head.position.y = h * 0.9
  head.castShadow = true
  group.add(head)
}

function buildLabel(label, level) {
  const sprite = makeTextSprite(label.text)
  sprite.position.set(label.x, level.elevation + Math.min(2.35, level.height - 0.7), label.z)
  sprite.userData = { id: label.id, type: 'label', levelId: label.levelId }
  sprite.raycast = () => {}
  return sprite
}

function makeTextSprite(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,252,247,0.92)'
  roundRect(ctx, 16, 24, 480, 80, 18)
  ctx.fill()
  ctx.fillStyle = '#1d1a16'
  ctx.font = '600 48px Sarabun, "Leelawadee UI", Tahoma, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  material.userData.owned = true
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(2.6, 0.65, 1)
  return sprite
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function buildConduit(run) {
  const group = new THREE.Group()
  group.userData = { id: run.id, type: 'conduit', levelId: run.levelId }
  const material = pvc()
  const points = run.points || []
  for (let i = 1; i < points.length; i += 1) addTube(group, points[i - 1], points[i], 0.018, material)
  for (let i = 1; i < points.length - 1; i += 1) {
    const before = new THREE.Vector3().subVectors(toVec(points[i]), toVec(points[i - 1])).normalize()
    const after = new THREE.Vector3().subVectors(toVec(points[i + 1]), toVec(points[i])).normalize()
    if (before.dot(after) < 0.92) {
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), material)
      elbow.position.copy(toVec(points[i]))
      group.add(elbow)
    }
  }
  return group
}

function buildLight(item) {
  const group = new THREE.Group()
  group.userData = { id: item.id, type: 'light', levelId: item.levelId }
  group.position.set(item.x, item.y, item.z)
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 16, 1, true), sharedMaterial('shade', { color: '#f7f4ee', roughness: 0.6, metalness: 0, side: THREE.DoubleSide }))
  shade.position.y = -0.08
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 8),
    sharedMaterial('bulb', { color: '#fff4cf', emissive: '#ffd978', emissiveIntensity: 0.8, roughness: 0.4, metalness: 0 }),
  )
  bulb.position.y = -0.12
  group.add(shade, bulb)
  return group
}

function buildDevice(item) {
  const group = new THREE.Group()
  group.userData = { id: item.id, type: 'device', levelId: item.levelId }
  group.position.set(item.x, item.y, item.z)
  group.rotation.y = item.rot || 0
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, item.kind === 'switch' ? 0.09 : 0.12, 0.025),
    sharedMaterial('plate', { color: '#f7f7f4', roughness: 0.55, metalness: 0 }),
  )
  group.add(plate)
  return group
}

function buildJunction(item) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.12), pvc())
  mesh.position.set(item.x, item.y, item.z)
  mesh.userData = { id: item.id, type: 'junction', levelId: item.levelId }
  return mesh
}

function buildRoof(project) {
  if (!project.roof || project.roof.type === 'none') return null
  const bounds = boundsOfWalls(project)
  if (!bounds) return null
  const overhang = project.roof.overhang ?? 0.6
  const y0 = roofBaseY(project)
  const minX = bounds.minX - overhang
  const maxX = bounds.maxX + overhang
  const minZ = bounds.minZ - overhang
  const maxZ = bounds.maxZ + overhang
  const group = new THREE.Group()
  group.name = 'roof'
  group.userData = { id: 'roof', type: 'roof' }
  const material = materialFor(project.roof.material, 4, 4)

  if (project.roof.type === 'flat') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.12, maxZ - minZ), material)
    mesh.position.set((minX + maxX) / 2, y0 + 0.06, (minZ + maxZ) / 2)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return group
  }

  const pitch = ((project.roof.pitch || 30) * Math.PI) / 180
  const sizeX = maxX - minX
  const sizeZ = maxZ - minZ
  const alongX = sizeX >= sizeZ
  const span = alongX ? sizeZ : sizeX
  const rise = Math.tan(pitch) * (span / 2)
  const midX = (minX + maxX) / 2
  const midZ = (minZ + maxZ) / 2
  const ridgeY = y0 + rise
  const gable = materialFor('plaster', 2, 2)
  if (alongX) {
    group.add(sheet(material, [minX, y0, minZ], [maxX, y0, minZ], [maxX, ridgeY, midZ], [minX, ridgeY, midZ]))
    group.add(sheet(material, [minX, ridgeY, midZ], [maxX, ridgeY, midZ], [maxX, y0, maxZ], [minX, y0, maxZ]))
    group.add(sheet(gable, [minX, y0, minZ], [minX, ridgeY, midZ], [minX, y0, maxZ], [minX, y0, maxZ]))
    group.add(sheet(gable, [maxX, y0, maxZ], [maxX, ridgeY, midZ], [maxX, y0, minZ], [maxX, y0, minZ]))
  } else {
    group.add(sheet(material, [minX, y0, minZ], [midX, ridgeY, minZ], [midX, ridgeY, maxZ], [minX, y0, maxZ]))
    group.add(sheet(material, [midX, ridgeY, minZ], [maxX, y0, minZ], [maxX, y0, maxZ], [midX, ridgeY, maxZ]))
    group.add(sheet(gable, [minX, y0, minZ], [maxX, y0, minZ], [midX, ridgeY, minZ], [midX, ridgeY, minZ]))
    group.add(sheet(gable, [maxX, y0, maxZ], [minX, y0, maxZ], [midX, ridgeY, maxZ], [midX, ridgeY, maxZ]))
  }
  return group
}

function boundsOfWalls(project) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let found = false
  for (const wall of project.elements) {
    if (wall.type !== 'wall') continue
    found = true
    minX = Math.min(minX, wall.x1, wall.x2)
    maxX = Math.max(maxX, wall.x1, wall.x2)
    minZ = Math.min(minZ, wall.z1, wall.z2)
    maxZ = Math.max(maxZ, wall.z1, wall.z2)
  }
  return found ? { minX, maxX, minZ, maxZ } : null
}

function sheet(material, a, b, c, d) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2))
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function addTube(group, a, b, radius, material) {
  const start = toVec(a)
  const end = toVec(b)
  const direction = end.clone().sub(start)
  const length = direction.length()
  if (length < 0.02) return
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material)
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  mesh.castShadow = true
  group.add(mesh)
}

function toVec(point) {
  return new THREE.Vector3(point.x, point.y ?? 0, point.z)
}

export function findOwned(root, id) {
  let found = null
  root.traverse((object) => {
    if (object.userData?.id === id) found = object
  })
  return found
}

export function payloadOf(object) {
  let current = object
  while (current) {
    if (current.userData?.id && current.userData.type !== 'site') return current.userData
    current = current.parent
  }
  return null
}

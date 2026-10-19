import * as THREE from 'three'
import { materialById } from '../lib/catalog.js'

const textureCache = new Map()
const solidCache = new Map()

export function materialFor(id, sizeU = 1, sizeV = 1) {
  const def = materialById(id)
  if (!def.pattern || def.pattern === 'solid') {
    if (!solidCache.has(def.id)) {
      solidCache.set(def.id, makeMaterial(def, null))
    }
    return solidCache.get(def.id)
  }
  const material = makeMaterial(def, patternedTexture(def, sizeU, sizeV))
  material.userData.owned = true
  return material
}

export function structureMaterial(kind) {
  const key = `structure-${kind}`
  if (!solidCache.has(key)) {
    const steel = kind === 'steel'
    solidCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color: steel ? '#7e8c99' : '#a39b91',
        roughness: steel ? 0.38 : 0.84,
        metalness: steel ? 0.62 : 0.02,
        side: THREE.DoubleSide,
      }),
    )
  }
  return solidCache.get(key)
}

export function sharedMaterial(key, props) {
  if (!solidCache.has(key)) {
    solidCache.set(key, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...props }))
  }
  return solidCache.get(key)
}

function makeMaterial(def, map) {
  return new THREE.MeshStandardMaterial({
    color: map ? '#ffffff' : def.color,
    map,
    roughness: def.roughness,
    metalness: def.metalness,
    transparent: def.opacity < 1,
    opacity: def.opacity,
    side: THREE.DoubleSide,
    depthWrite: def.opacity >= 1,
  })
}

function patternedTexture(def, sizeU, sizeV) {
  const base = textureCache.get(`${def.pattern}:${def.color}`) || createTexture(def.pattern, def.color)
  textureCache.set(`${def.pattern}:${def.color}`, base)
  const texture = base.clone()
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(Math.max(0.4, sizeU), Math.max(0.4, sizeV))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createTexture(pattern, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 256, 256)
  if (pattern === 'brick') drawBrick(ctx, color)
  if (pattern === 'wood') drawWood(ctx, color)
  if (pattern === 'tile') drawTile(ctx)
  if (pattern === 'noise') drawNoise(ctx, color)
  if (pattern === 'ridge') drawRidge(ctx, color)
  if (pattern === 'grass') drawGrass(ctx, color)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function drawBrick(ctx, color) {
  ctx.fillStyle = shade(color, -28)
  for (let y = 0; y < 256; y += 32) ctx.fillRect(0, y, 256, 3)
  ctx.fillStyle = shade(color, -18)
  for (let row = 0; row < 8; row += 1) {
    const offset = row % 2 ? 32 : 0
    for (let x = -64; x < 256; x += 64) ctx.fillRect(x + offset, row * 32, 3, 32)
  }
}

function drawWood(ctx, color) {
  for (let x = 0; x < 256; x += 8) {
    ctx.fillStyle = shade(color, (x / 8) % 2 ? -16 : 10)
    ctx.fillRect(x, 0, 3, 256)
  }
}

function drawTile(ctx) {
  ctx.strokeStyle = 'rgba(60,48,36,0.28)'
  ctx.lineWidth = 3
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 256)
    ctx.moveTo(0, i)
    ctx.lineTo(256, i)
    ctx.stroke()
  }
}

function drawNoise(ctx, color) {
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = shade(color, Math.random() * 36 - 18)
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
  }
}

function drawRidge(ctx, color) {
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = shade(color, y % 32 ? -22 : 16)
    ctx.fillRect(0, y, 256, 5)
  }
}

function drawGrass(ctx, color) {
  drawNoise(ctx, color)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  for (let i = 0; i < 40; i += 1) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * 256, Math.random() * 256)
    ctx.lineTo(Math.random() * 256, Math.random() * 256)
    ctx.stroke()
  }
}

function shade(hex, delta) {
  const value = hex.replace('#', '')
  const num = Number.parseInt(value, 16)
  const channels = [num >> 16, (num >> 8) & 255, num & 255].map((channel) =>
    Math.max(0, Math.min(255, channel + delta)),
  )
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
}

export function disposeOwned(root) {
  const geometries = new Set()
  const materials = new Set()
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const list = object.material ? [].concat(object.material) : []
    for (const material of list) {
      if (material?.userData?.owned) materials.add(material)
    }
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) {
    material.map?.dispose()
    material.dispose()
  }
}

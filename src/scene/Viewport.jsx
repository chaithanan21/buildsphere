import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ENGINEERING } from '../lib/catalog.js'
import { ceilingY, elementsFromDraw, engineeringElement, furnitureElement, makeColumn, placeOpening } from '../lib/assemble.js'
import { focusOf, levelById, normalizeRect, pointSegmentDistance, snapPoint, wallLength } from '../lib/geometry.js'
import { uid } from '../lib/ids.js'
import { ENGINEERING_LIMIT, resizeFromEdge, samePose } from '../lib/resize.js'
import { buildWalkPath } from '../lib/walk.js'
import { useStudio } from '../state/store.jsx'
import { buildContent, clearContent, findOwned, payloadOf } from './buildScene.js'
import { disposeOwned } from './materials.js'

const DRAW_TOOLS = new Set(['room', 'wall', 'slab', 'beam', 'stair'])
const PLACE_TOOLS = new Set(['column', 'light', 'junction', 'furniture'])

function engineeringMode(tool) {
  if (!tool || tool.id !== 'engineering') return null
  return ENGINEERING[tool.kind]?.mode || null
}

function draws(tool) {
  const mode = engineeringMode(tool)
  return Boolean(tool) && (DRAW_TOOLS.has(tool.id) || mode === 'rect' || mode === 'line')
}

function places(tool) {
  return Boolean(tool) && (PLACE_TOOLS.has(tool.id) || engineeringMode(tool) === 'point')
}

export default function Viewport() {
  const studio = useStudio()
  const studioRef = useRef(studio)
  studioRef.current = studio
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const hudRef = useRef(null)
  const compassRef = useRef(null)
  const actionsRef = useRef({})
  const [webglError, setWebglError] = useState('')
  const [conduitMode, setConduitMode] = useState('ceiling')
  const [conduitCount, setConduitCount] = useState(0)
  const conduitModeRef = useRef('ceiling')
  const keepDraft = useRef(false)
  conduitModeRef.current = conduitMode

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 250)
    camera.position.set(18, 14, 18)
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    } catch {
      setWebglError('เปิดภาพสามมิติไม่ได้ ลองใช้เบราว์เซอร์ที่รองรับ WebGL')
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.02
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const hemi = new THREE.HemisphereLight('#d5e6f4', '#e7d7bf', 0.95)
    const sun = new THREE.DirectionalLight('#fff3df', 2.15)
    sun.position.set(16, 28, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 90
    sun.shadow.bias = -0.00035
    const fill = new THREE.DirectionalLight('#f7fbff', 0.45)
    fill.position.set(-12, 10, -8)
    scene.add(hemi, sun, fill)

    const content = new THREE.Group()
    const preview = new THREE.Group()
    const gizmo = new THREE.Group()
    scene.add(content, preview, gizmo)
    const handleMaterial = {
      w: new THREE.MeshBasicMaterial({ color: '#c24e24', depthTest: false }),
      d: new THREE.MeshBasicMaterial({ color: '#1f4d45', depthTest: false }),
      move: new THREE.MeshBasicMaterial({ color: '#fff8ef', depthTest: false }),
    }
    const boxMaterial = new THREE.LineBasicMaterial({ color: '#c24e24' })
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.minDistance = 0.8
    controls.maxDistance = 90
    controls.target.set(0, 1, 0)
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const draft = { anchor: null, conduit: [] }
    const keys = new Set()
    const play = { current: null }
    const look = { active: false, yaw: 0, pitch: 0 }
    const glance = { x: 0, y: 0, armed: false }
    const aim = new THREE.Vector3()
    const move = { id: null }
    const sizing = { id: null, axis: null, sign: 1, base: null, dims: null, pos: null }
    let flying = null
    let recorder = null

    function resize() {
      const width = wrap.clientWidth || 1
      const height = wrap.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)

    function currentLevel() {
      const project = studioRef.current.project
      return levelById(project, project.activeLevelId)
    }

    function setHud(text) {
      if (hudRef.current) hudRef.current.textContent = text
    }

    function clientPointer(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
    }

    function planePoint(clientX, clientY) {
      clientPointer(clientX, clientY)
      const hit = new THREE.Vector3()
      const ok = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -currentLevel().elevation), hit)
      if (!ok) return null
      return snapPoint({ x: hit.x, z: hit.z }, 0.25)
    }

    function pick(clientX, clientY) {
      clientPointer(clientX, clientY)
      const hits = raycaster.intersectObjects(content.children, true)
      for (const hit of hits) {
        if (!hit.object.visible) continue
        const info = payloadOf(hit.object)
        if (info) return { ...info, point: hit.point }
      }
      return null
    }

    function elementById(id) {
      return studioRef.current.project.elements.find((item) => item.id === id)
    }

    function nearestWall(point, levelId) {
      let best = null
      let bestDistance = 1.1
      for (const wall of studioRef.current.project.elements) {
        if (wall.type !== 'wall' || wall.levelId !== levelId) continue
        const distance = pointSegmentDistance(point.x, point.z, wall.x1, wall.z1, wall.x2, wall.z2)
        if (distance < bestDistance) {
          bestDistance = distance
          best = wall
        }
      }
      return best
    }

    function clearPreview() {
      disposeOwned(preview)
      preview.clear()
    }

    function showSegment(a, b, y, thickness, height, color) {
      const length = Math.hypot(b.x - a.x, b.z - a.z)
      if (length < 0.05) return
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height, length),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }),
      )
      mesh.material.userData.owned = true
      mesh.position.set((a.x + b.x) / 2, y + height / 2, (a.z + b.z) / 2)
      mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
      mesh.raycast = () => {}
      preview.add(mesh)
    }

    function showRect(rect, y, height) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(rect.w, 0.05), height, Math.max(rect.d, 0.05)),
        new THREE.MeshBasicMaterial({ color: '#c24e24', transparent: true, opacity: 0.28, depthWrite: false }),
      )
      mesh.material.userData.owned = true
      mesh.position.set(rect.x + rect.w / 2, y + height / 2, rect.z + rect.d / 2)
      mesh.raycast = () => {}
      preview.add(mesh)
    }

    function previewDraw(a, b) {
      clearPreview()
      const tool = studioRef.current.tool
      const level = currentLevel()
      if (!a || !b) return
      if (tool.id === 'room' || tool.id === 'slab' || tool.id === 'stair' || engineeringMode(tool) === 'rect') {
        const rect = normalizeRect(a, b)
        const height = tool.id === 'slab' ? 0.12 : engineeringMode(tool) === 'rect' ? 0.18 : 0.4
        showRect(rect, level.elevation, height)
        setHud(`${rect.w.toFixed(2)} × ${rect.d.toFixed(2)} ม.`)
      } else {
        const footing = engineeringMode(tool) === 'line'
        showSegment(a, b, level.elevation, footing ? 0.2 : 0.15, footing ? 0.22 : level.height - 0.35, '#1f4d45')
        setHud(`${Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)} ม.`)
      }
    }

    function previewConduit() {
      clearPreview()
      const material = new THREE.MeshBasicMaterial({ color: '#e2b008' })
      material.userData.owned = true
      for (const point of draft.conduit) {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), material)
        marker.position.set(point.x, point.y, point.z)
        marker.raycast = () => {}
        preview.add(marker)
      }
      setConduitCount(draft.conduit.length)
      setHud(draft.conduit.length ? `แนวท่อ ${draft.conduit.length} จุด · Enter เพื่อจบ` : 'คลิกจุดแรกของท่อ')
    }

    function finishConduit() {
      if (draft.conduit.length < 2) {
        studioRef.current.notify('แนวท่อต้องมีอย่างน้อย 2 จุด')
        return
      }
      const level = currentLevel()
      studioRef.current.add([
        { id: uid('pipe'), type: 'conduit', levelId: level.id, points: draft.conduit.map((point) => ({ ...point })) },
      ])
      draft.conduit = []
      setConduitCount(0)
      clearPreview()
      setHud('บันทึกแนวท่อแล้ว ความยาวเข้า BOQ')
    }

    function placeAt(point, clientX, clientY) {
      const app = studioRef.current
      const tool = app.tool
      const level = currentLevel()
      if (tool.id === 'column') {
        app.add([makeColumn(level, point.x, point.z, app.project.structureMaterial || 'concrete')])
        return
      }
      if (tool.id === 'light') {
        const y = ceilingY(level, 'ceiling')
        app.add([{ id: uid('lamp'), type: 'light', levelId: level.id, x: point.x, y, z: point.z }])
        return
      }
      if (tool.id === 'junction') {
        const y = ceilingY(level, 'ceiling')
        app.add([{ id: uid('box'), type: 'junction', levelId: level.id, x: point.x, y, z: point.z }])
        return
      }
      if (tool.id === 'furniture') {
        const piece = furnitureElement(level, tool.kind || 'table', point.x, point.z)
        app.add([piece])
        app.setSelection(piece.id)
        app.setTool({ id: 'select', kind: null })
        setHud('ลากตัวชิ้นงานเพื่อย้าย · ขอบส้มปรับกว้าง · ขอบเขียวปรับยาว')
        return piece.id
      }
      if (tool.id === 'engineering') {
        const piece = engineeringElement(level, tool.kind, { x: point.x, z: point.z })
        if (!piece) return null
        app.add([piece])
        app.setSelection(piece.id)
        setHud('วางแล้ว คลิกจุดถัดไป หรือลากขอบส้มกับขอบเขียวเพื่อปรับขนาด')
        return piece.id
      }
      if (tool.id === 'door' || tool.id === 'window' || tool.id === 'outlet' || tool.id === 'switch') {
        const hit = clientX != null ? pick(clientX, clientY) : null
        const wall = hit?.type === 'wall' ? elementById(hit.id) : nearestWall(point, level.id)
        if (!wall || wall.levelId !== level.id) {
          app.notify('คลิกบนผนังของชั้นที่กำลังทำ')
          return
        }
        if (tool.id === 'door' || tool.id === 'window') {
          const spec =
            tool.id === 'door'
              ? { type: 'door', width: 0.9, height: 2.1 }
              : { type: 'window', width: 1.2, height: 1.15, sill: 0.9 }
          const opening = placeOpening(wall, point.x, point.z, spec)
          if (!opening) app.notify('ผนังนี้สั้นกว่าช่องเปิด')
          else app.add([opening])
          return
        }
        const y = level.elevation + (tool.id === 'switch' ? 1.2 : 0.35)
        const spot = hit?.point || { x: point.x, y, z: point.z }
        app.add([
          {
            id: uid(tool.id),
            type: 'device',
            levelId: level.id,
            kind: tool.id,
            x: spot.x,
            y,
            z: spot.z,
            rot: Math.atan2(wall.x2 - wall.x1, wall.z2 - wall.z1),
          },
        ])
      }
    }

    function commitDraw(a, b) {
      const app = studioRef.current
      const elements = elementsFromDraw(app.project, app.tool.id, a, b, { kind: app.tool.kind })
      clearPreview()
      draft.anchor = null
      if (!elements.length) {
        app.notify('ลากให้ยาวอย่างน้อยประมาณหนึ่งเมตร')
        return
      }
      app.add(elements)
      const rect = normalizeRect(a, b)
      setHud(app.tool.id === 'room' ? `ได้ห้อง ${rect.w.toFixed(2)} × ${rect.d.toFixed(2)} ม. พร้อมโครงสร้าง` : app.tool.id === 'engineering' ? 'เพิ่มงานวิศวกรรมแล้ว ปริมาณเข้าหมวดฐานรากหรือพื้น' : 'เพิ่มลงโมเดลแล้ว')
    }

    function applyMaterial(hit, materialId) {
      if (!hit) {
        studioRef.current.notify('ปล่อยวัสดุบนพื้น ผนัง หรือหลังคา')
        return
      }
      if (hit.type === 'roof' || hit.type === 'wall' || hit.type === 'slab') {
        studioRef.current.applyFinish(hit, materialId)
        setHud(`ลงวัสดุบน${hit.type === 'roof' ? 'หลังคา' : hit.type === 'slab' ? 'พื้น' : 'ผนัง'}แล้ว`)
      }
    }

    function drop(clientX, clientY, payload) {
      const point = planePoint(clientX, clientY)
      if (!point || !payload) return
      if (payload.drag === 'material') {
        applyMaterial(pick(clientX, clientY), payload.id)
        return
      }
      const tool = { id: payload.tool, kind: payload.kind || null }
      studioRef.current.setTool(tool)
      if (places(tool) || tool.id === 'door' || tool.id === 'window' || tool.id === 'outlet' || tool.id === 'switch') {
        const previous = studioRef.current.tool
        studioRef.current.tool = tool
        placeAt(point, clientX, clientY)
        if (tool.id !== 'furniture') studioRef.current.tool = previous
        return
      }
      if (draws(tool)) {
        keepDraft.current = true
        draft.anchor = point
        draft.cursor = point
        setHud('คลิกจุดที่สอง หรือลากต่อให้จบ')
      }
    }

    function clearGizmo() {
      for (const child of [...gizmo.children]) {
        child.geometry?.dispose()
        child.removeFromParent()
      }
      gizmo.userData.forId = null
    }

    function selectedFurniture() {
      const app = studioRef.current
      const item = elementById(app.selection)
      if (!item) return null
      const adjustable = item.type === 'furniture' || (item.type === 'engineering' && item.x1 == null)
      if (!adjustable) return null
      if (app.presentation === 'walk' || app.presentation === 'play') return null
      const object = findOwned(content, item.id)
      if (!object?.visible) return null
      return item
    }

    function liveSize(item) {
      if (sizing.id === item.id && sizing.dims) return sizing.dims
      return { w: item.w, d: item.d, h: item.h }
    }

    function livePoint(item) {
      if (sizing.id === item.id && sizing.pos) return sizing.pos
      const object = findOwned(content, item.id)
      if (move.id === item.id && object) return { x: object.position.x, z: object.position.z }
      return { x: item.x, z: item.z }
    }

    function layoutGizmo(item) {
      const dims = liveSize(item)
      const level = levelById(studioRef.current.project, item.levelId)
      const point = livePoint(item)
      gizmo.position.set(point.x, level.elevation + 0.12, point.z)
      gizmo.rotation.y = item.rot || 0
      gizmo.visible = true
      const reach = Math.max(0.5, camera.position.distanceTo(gizmo.position))
      const rect = canvas.getBoundingClientRect()
      const thick = Math.max(0.08, (18 / Math.max(rect.height, 1)) * reach * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 2)
      for (const handle of gizmo.children) {
        const { axis, sign } = handle.userData
        if (axis === 'w') {
          handle.position.set(sign * dims.w / 2, Math.max(dims.h * 0.45, thick), 0)
          handle.scale.set(thick, thick * 2.2, Math.max(dims.d, thick))
        } else if (axis === 'd') {
          handle.position.set(0, Math.max(dims.h * 0.45, thick), sign * dims.d / 2)
          handle.scale.set(Math.max(dims.w, thick), thick * 2.2, thick)
        } else if (axis === 'move') {
          handle.position.set(0, dims.h + thick * 1.6, 0)
          handle.scale.set(thick * 1.5, thick * 1.5, thick * 0.7)
        }
      }
      const frame = gizmo.children.find((child) => child.userData.frame)
      if (frame) {
        frame.scale.set(dims.w, dims.h, dims.d)
        frame.position.y = dims.h / 2
      }
    }

    function showGizmo(item) {
      if (gizmo.userData.forId !== item.id) {
        clearGizmo()
        const box = new THREE.BoxGeometry(1, 1, 1)
        const frame = new THREE.LineSegments(new THREE.EdgesGeometry(box), boxMaterial)
        box.dispose()
        frame.userData.frame = true
        frame.raycast = () => {}
        gizmo.add(frame)
        for (const spec of [
          { axis: 'w', sign: 1 },
          { axis: 'w', sign: -1 },
          { axis: 'd', sign: 1 },
          { axis: 'd', sign: -1 },
        ]) {
          const handle = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), handleMaterial[spec.axis])
          handle.userData.axis = spec.axis
          handle.userData.sign = spec.sign
          handle.renderOrder = 3
          gizmo.add(handle)
        }
        const mover = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), handleMaterial.move)
        mover.userData.axis = 'move'
        mover.renderOrder = 4
        gizmo.add(mover)
        gizmo.userData.forId = item.id
      }
      layoutGizmo(item)
    }

    function hideGizmo() {
      gizmo.visible = false
    }

    function pickGizmo(clientX, clientY) {
      if (!gizmo.visible) return null
      clientPointer(clientX, clientY)
      const hits = raycaster.intersectObjects(gizmo.children, false)
      const hit = hits.find((item) => item.object.userData.axis)
      if (!hit) return null
      return { object: hit.object, point: hit.point }
    }

    function resizeCursor(axis) {
      if (axis === 'move') return 'grab'
      if (axis === 'd') return 'ns-resize'
      return 'ew-resize'
    }

    function axisDirection(item, axis) {
      const rot = item.rot || 0
      if (axis === 'h') return new THREE.Vector3(0, 1, 0)
      if (axis === 'w') return new THREE.Vector3(Math.cos(rot), 0, -Math.sin(rot))
      return new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot))
    }

    function dragDimensions(clientX, clientY) {
      const item = elementById(sizing.id)
      if (!item) return null
      clientPointer(clientX, clientY)
      const level = levelById(studioRef.current.project, item.levelId)
      const origin = new THREE.Vector3(item.x, level.elevation + 0.12, item.z)
      const hit = new THREE.Vector3()
      const direction = axisDirection(item, sizing.axis)
      const toCamera = camera.position.clone().sub(origin)
      const normal = new THREE.Vector3().crossVectors(direction, toCamera).cross(direction)
      if (normal.lengthSq() < 1e-8) normal.set(0, 1, 0)
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal.normalize(), origin)
      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      const along = hit.clone().sub(origin).dot(direction)
      const sized = resizeFromEdge(sizing.base, sizing.axis, sizing.sign, along, sizing.limits)
      return {
        w: sized.w,
        d: sized.d,
        h: sized.h,
        x: item.x + direction.x * sized.shift,
        z: item.z + direction.z * sized.shift,
      }
    }

    function previewResize(dims) {
      sizing.dims = { w: dims.w, d: dims.d, h: dims.h }
      sizing.pos = { x: dims.x, z: dims.z }
      const object = findOwned(content, sizing.id)
      if (object && sizing.base.w && sizing.base.d && sizing.base.h) {
        object.scale.set(dims.w / sizing.base.w, dims.h / sizing.base.h, dims.d / sizing.base.d)
        object.position.x = dims.x
        object.position.z = dims.z
      }
      const item = elementById(sizing.id)
      if (item) layoutGizmo(item)
      setHud(`กว้าง ${dims.w.toFixed(2)} ม. · ยาว ${dims.d.toFixed(2)} ม.`)
    }

    function beginResize(event, grip) {
      const item = elementById(studioRef.current.selection)
      if (!item) return
      if (grip.object.userData.axis === 'move') {
        move.id = item.id
        canvas.style.cursor = 'grabbing'
        event.stopPropagation()
        return
      }
      sizing.id = item.id
      sizing.axis = grip.object.userData.axis
      sizing.sign = grip.object.userData.sign || 1
      sizing.base = { w: item.w, d: item.d, h: item.h, x: item.x, z: item.z }
      sizing.limits = item.type === 'engineering' ? ENGINEERING_LIMIT : undefined
      sizing.dims = { w: item.w, d: item.d, h: item.h }
      sizing.pos = { x: item.x, z: item.z }
      canvas.style.cursor = resizeCursor(sizing.axis)
      event.stopPropagation()
    }

    function finishResize() {
      if (!sizing.id) return
      const id = sizing.id
      const dims = sizing.dims
      const pos = sizing.pos
      const base = sizing.base
      const object = findOwned(content, id)
      const next = dims && pos ? { ...dims, x: pos.x, z: pos.z } : null
      sizing.id = null
      sizing.dims = null
      sizing.pos = null
      sizing.base = null
      canvas.style.cursor = ''
      if (next && base && !samePose(next, base)) studioRef.current.patch(id, { w: next.w, d: next.d, h: next.h, x: next.x, z: next.z })
      else if (object && base) {
        object.scale.set(1, 1, 1)
        object.position.x = base.x
        object.position.z = base.z
      }
    }

    function lookingInside() {
      const mode = studioRef.current.presentation
      if (mode === 'plan' || mode === 'walk' || mode === 'play') return false
      if (mode === 'interior') return true
      return camera.position.distanceTo(controls.target) < 7
    }

    function aimAhead() {
      camera.getWorldDirection(aim)
      controls.target.copy(camera.position).addScaledVector(aim, 2.2)
    }

    function nudgeLook(yaw, pitch) {
      const mode = studioRef.current.presentation
      if (mode === 'play') return
      if (mode === 'walk') {
        look.yaw += yaw
        look.pitch = Math.max(-1.05, Math.min(1.05, look.pitch + pitch))
        camera.rotation.order = 'YXZ'
        camera.rotation.y = look.yaw
        camera.rotation.x = look.pitch
        return
      }
      flying = null
      const distance = camera.position.distanceTo(controls.target)
      camera.getWorldDirection(aim)
      if (lookingInside()) {
        const up = new THREE.Vector3(0, 1, 0)
        aim.applyAxisAngle(up, yaw)
        const right = new THREE.Vector3().crossVectors(aim, up)
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
        right.normalize()
        aim.applyAxisAngle(right, pitch)
        aim.y = Math.max(-0.82, Math.min(0.82, aim.y))
        aim.normalize()
        controls.target.copy(camera.position).addScaledVector(aim, Math.max(distance, 2))
      } else {
        const offset = camera.position.clone().sub(controls.target)
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw)
        const axis = new THREE.Vector3(-offset.z, 0, offset.x)
        if (axis.lengthSq() > 1e-6) offset.applyAxisAngle(axis.normalize(), -pitch)
        camera.position.copy(controls.target).add(offset)
      }
      controls.update()
    }

    function onPointerDown(event) {
      if (event.button !== 0) return
      const app = studioRef.current
      if (app.presentation === 'walk') {
        look.active = true
        event.stopPropagation()
        return
      }
      if (app.presentation === 'play') return
      const grip = pickGizmo(event.clientX, event.clientY)
      if (grip) {
        beginResize(event, grip)
        return
      }
      const point = planePoint(event.clientX, event.clientY)
      const toolId = app.tool.id
      if (toolId === 'select') {
        const hit = pick(event.clientX, event.clientY)
        const movable = hit && (['furniture', 'column', 'light', 'device', 'junction', 'label'].includes(hit.type) || (hit.type === 'engineering' && hit.x1 == null))
        if (lookingInside() && !movable) {
          glance.armed = true
          glance.x = event.clientX
          glance.y = event.clientY
          aimAhead()
          event.stopPropagation()
          return
        }
        if (!hit) {
          app.setSelection(null)
          return
        }
        event.stopPropagation()
        app.setSelection(hit.id)
        if (movable) move.id = hit.id
        return
      }
      event.stopPropagation()
      if (!point) return
      if (toolId === 'material') {
        applyMaterial(pick(event.clientX, event.clientY), app.tool.kind)
        return
      }
      if (toolId === 'conduit') {
        if (event.detail === 2) {
          finishConduit()
          return
        }
        const y = ceilingY(currentLevel(), conduitModeRef.current)
        draft.conduit.push({ x: point.x, y, z: point.z })
        previewConduit()
        return
      }
      if (places(app.tool) || toolId === 'door' || toolId === 'window' || toolId === 'outlet' || toolId === 'switch') {
        placeAt(point, event.clientX, event.clientY)
        return
      }
      if (draws(app.tool)) {
        if (draft.anchor && Math.hypot(draft.anchor.x - point.x, draft.anchor.z - point.z) > 0.4) {
          commitDraw(draft.anchor, point)
        } else {
          draft.anchor = point
          draft.cursor = point
          setHud('ลากไปอีกมุม หรือคลิกจุดที่สอง')
        }
      }
    }

    function onPointerMove(event) {
      const app = studioRef.current
      if (app.presentation === 'walk' && look.active) {
        look.yaw -= event.movementX * 0.005
        look.pitch = Math.max(-1.05, Math.min(1.05, look.pitch - event.movementY * 0.005))
        camera.rotation.order = 'YXZ'
        camera.rotation.y = look.yaw
        camera.rotation.x = look.pitch
        return
      }
      if (glance.armed) {
        const dx = event.clientX - glance.x
        const dy = event.clientY - glance.y
        glance.x = event.clientX
        glance.y = event.clientY
        if (dx || dy) nudgeLook(-dx * 0.005, -dy * 0.005)
        return
      }
      if (sizing.id) {
        const dims = dragDimensions(event.clientX, event.clientY)
        if (dims) previewResize(dims)
        return
      }
      const point = planePoint(event.clientX, event.clientY)
      if (!point) return
      if (!move.id && studioRef.current.tool.id === 'select') {
        const grip = pickGizmo(event.clientX, event.clientY)
        canvas.style.cursor = grip ? resizeCursor(grip.object.userData.axis) : ''
      }
      if (move.id) {
        const object = findOwned(content, move.id)
        if (object) {
          object.position.x = point.x
          object.position.z = point.z
        }
        return
      }
      draft.cursor = point
      if (draft.anchor && draws(app.tool)) previewDraw(draft.anchor, point)
    }

    function onPointerUp(event) {
      look.active = false
      if (glance.armed) {
        const moved = Math.hypot((event?.clientX || 0) - glance.x, (event?.clientY || 0) - glance.y)
        glance.armed = false
        if (moved < 6) {
          const hit = pick(event.clientX, event.clientY)
          studioRef.current.setSelection(hit?.id || null)
        }
        return
      }
      if (sizing.id) {
        finishResize()
        return
      }
      if (move.id) {
        const object = findOwned(content, move.id)
        if (object) studioRef.current.patch(move.id, { x: object.position.x, z: object.position.z })
        move.id = null
        canvas.style.cursor = ''
        return
      }
      const app = studioRef.current
      if (draft.anchor && draft.cursor && draws(app.tool)) {
        const length = Math.hypot(draft.cursor.x - draft.anchor.x, draft.cursor.z - draft.anchor.z)
        if (length > 0.45) commitDraw(draft.anchor, draft.cursor)
      }
    }

    function blocked(x, z, footY) {
      const project = studioRef.current.project
      for (const wall of project.elements) {
        if (wall.type !== 'wall') continue
        const level = levelById(project, wall.levelId)
        if (footY < level.elevation - 0.2 || footY > level.elevation + wall.height - 0.15) continue
        if (pointSegmentDistance(x, z, wall.x1, wall.z1, wall.x2, wall.z2) > wall.thickness / 2 + 0.22) continue
        const length = wallLength(wall)
        const along = ((x - wall.x1) * (wall.x2 - wall.x1) + (z - wall.z1) * (wall.z2 - wall.z1)) / length
        const door = project.elements.find((item) => {
          if (item.type !== 'door' || item.wallId !== wall.id) return false
          return Math.abs(along - item.t * length) < item.width / 2 + 0.08 && footY - level.elevation < item.height
        })
        if (!door) return true
      }
      return false
    }

    function floorY(x, z, currentY) {
      const project = studioRef.current.project
      for (const stair of project.elements) {
        if (stair.type !== 'stair') continue
        if (x < stair.x || x > stair.x + stair.w || z < stair.z || z > stair.z + stair.d) continue
        const level = levelById(project, stair.levelId)
        const index = project.levels.findIndex((item) => item.id === level.id)
        const next = project.levels[index + 1]
        const top = next ? next.elevation : level.elevation + level.height
        const t = stair.dir === 'x' ? (x - stair.x) / stair.w : (z - stair.z) / stair.d
        return level.elevation + Math.max(0, Math.min(1, t)) * (top - level.elevation) + 1.65
      }
      let best = project.levels[0].elevation + 1.65
      let score = Infinity
      for (const slab of project.elements) {
        if (slab.type !== 'slab') continue
        if (x < slab.x || x > slab.x + slab.w || z < slab.z || z > slab.z + slab.d) continue
        const eye = levelById(project, slab.levelId).elevation + 1.65
        const distance = Math.abs(eye - currentY)
        if (distance < score) {
          score = distance
          best = eye
        }
      }
      return best
    }

    function stepWalk(dt) {
      const yaw = camera.rotation.y
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0))
      let x = 0
      let z = 0
      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        x += forward.x
        z += forward.z
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        x -= forward.x
        z -= forward.z
      }
      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        x += right.x
        z += right.z
      }
      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        x -= right.x
        z -= right.z
      }
      const length = Math.hypot(x, z)
      const speed = (keys.has('ShiftLeft') ? 3.1 : 1.7) * dt
      let nx = camera.position.x
      let nz = camera.position.z
      if (length > 0) {
        const stepX = (x / length) * speed
        const stepZ = (z / length) * speed
        const foot = camera.position.y - 1.65
        if (!blocked(nx + stepX, nz, foot)) nx += stepX
        if (!blocked(nx, nz + stepZ, foot)) nz += stepZ
      }
      const project = studioRef.current.project
      nx = Math.max(-project.site.width / 2, Math.min(project.site.width / 2, nx))
      nz = Math.max(-project.site.depth / 2, Math.min(project.site.depth / 2, nz))
      camera.position.x = nx
      camera.position.z = nz
      camera.position.y = floorY(nx, nz, camera.position.y)
    }

    function stepPlay(dt) {
      const run = play.current
      if (!run) return
      run.dist += dt * 1.55
      while (run.seg < run.lengths.length && run.dist > run.lengths[run.seg]) {
        run.dist -= run.lengths[run.seg]
        run.seg += 1
      }
      if (run.seg >= run.points.length - 1) {
        finishPlay()
        return
      }
      const a = run.points[run.seg]
      const b = run.points[run.seg + 1]
      const t = run.lengths[run.seg] ? run.dist / run.lengths[run.seg] : 1
      camera.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t)
      const lookAt = run.points[Math.min(run.points.length - 1, run.seg + 1)]
      camera.lookAt(lookAt.x, lookAt.y - 0.15, lookAt.z)
    }

    function startRecorder() {
      if (!studioRef.current.recordWalk || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') return
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type))
      if (!mime) {
        studioRef.current.notify('เบราว์เซอร์นี้เดินชมได้ แต่อัดไฟล์วิดีโอไม่ได้')
        return
      }
      const chunks = []
      const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime })
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mime })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${studioRef.current.project.name}-walk.webm`
        link.click()
        URL.revokeObjectURL(url)
      }
      rec.start()
      recorder = rec
    }

    function stopRecorder() {
      if (recorder && recorder.state !== 'inactive') recorder.stop()
      recorder = null
    }

    function finishPlay() {
      play.current = null
      stopRecorder()
      studioRef.current.setPresentation('interior')
    }

    function startPlay() {
      const points = buildWalkPath(studioRef.current.project)
      if (points.length < 2) {
        studioRef.current.notify('ยังไม่มีพื้นที่ให้เดิน ลากห้องหรือเปิดเทมเพลตก่อน')
        studioRef.current.setPresentation('orbit')
        return
      }
      play.current = {
        points,
        seg: 0,
        dist: 0,
        lengths: points.slice(0, -1).map((point, index) => Math.hypot(points[index + 1].x - point.x, points[index + 1].y - point.y, points[index + 1].z - point.z)),
      }
      controls.enabled = false
      startRecorder()
    }

    function enterWalk() {
      const points = buildWalkPath(studioRef.current.project)
      const level = currentLevel()
      const spot = points[1] || points[0] || { x: 0, y: level.elevation + 1.65, z: 0 }
      camera.position.set(spot.x, spot.y, spot.z)
      look.yaw = 0
      look.pitch = 0
      camera.rotation.order = 'YXZ'
      camera.rotation.set(0, 0, 0)
      controls.enabled = false
    }

    function fly(mode) {
      const project = studioRef.current.project
      const focus = focusOf(project)
      const level = currentLevel()
      let position
      let target
      if (mode === 'plan') {
        position = new THREE.Vector3(focus.x, focus.span * 1.45 + 6, focus.z + 0.02)
        target = new THREE.Vector3(focus.x, 0, focus.z)
        controls.maxPolarAngle = 0.42
      } else if (mode === 'interior') {
        const slab = project.elements.find((item) => item.type === 'slab' && item.levelId === level.id) || project.elements.find((item) => item.type === 'slab')
        const base = slab ? levelById(project, slab.levelId) : level
        const x = slab ? slab.x + Math.min(1.8, slab.w * 0.35) : focus.x
        const z = slab ? slab.z + Math.min(1.8, slab.d * 0.35) : focus.z
        position = new THREE.Vector3(x, base.elevation + 1.65, z)
        target = new THREE.Vector3(x + 1.5, base.elevation + 1.45, z + 2.4)
        controls.maxPolarAngle = Math.PI / 2 - 0.02
      } else {
        position = new THREE.Vector3(focus.x + focus.span * 1.55, focus.span * 0.95 + 2.5, focus.z + focus.span * 1.55)
        target = new THREE.Vector3(focus.x, Math.max(1.6, focus.top * 0.4), focus.z)
        controls.maxPolarAngle = Math.PI / 2 - 0.05
      }
      flying = {
        fromP: camera.position.clone(),
        fromT: controls.target.clone(),
        position,
        target,
        started: performance.now(),
      }
      controls.enabled = true
    }

    function rebuild() {
      clearContent(content)
      content.add(buildContent(studioRef.current.project))
      const span = Math.max(studioRef.current.project.site.width, studioRef.current.project.site.depth) * 0.7
      sun.shadow.camera.left = -span
      sun.shadow.camera.right = span
      sun.shadow.camera.top = span
      sun.shadow.camera.bottom = -span
      sun.shadow.camera.updateProjectionMatrix()
    }

    function applyFilters() {
      const app = studioRef.current
      content.traverse((object) => {
        if (object.userData?.cover) {
          object.visible = app.style !== 'structure'
          return
        }
        const type = object.userData?.type
        if (!type || type === 'site') return
        let visible = true
        if (app.style === 'structure' && ['wall', 'furniture', 'label', 'device'].includes(type)) visible = false
        if (app.style === 'architecture' && (type === 'column' || type === 'beam' || type === 'engineering')) visible = false
        if (!app.showAllLevels && object.userData.levelId && object.userData.levelId !== app.project.activeLevelId) visible = false
        if (type === 'roof' && ['interior', 'walk', 'play'].includes(app.presentation)) visible = false
        object.visible = visible
      })
    }

    function highlight() {
      const doomed = []
      content.traverse((object) => {
        if (object.userData?.edge) doomed.push(object)
      })
      for (const item of doomed) {
        item.geometry?.dispose()
        item.material?.dispose()
        item.removeFromParent()
      }
      const id = studioRef.current.selection
      if (!id) return
      const object = findOwned(content, id)
      if (!object) return
      object.traverse((child) => {
        if (!child.isMesh || child.userData.edge) return
        const lines = new THREE.LineSegments(
          new THREE.EdgesGeometry(child.geometry, 28),
          new THREE.LineBasicMaterial({ color: '#c24e24' }),
        )
        lines.userData.edge = true
        lines.raycast = () => {}
        child.add(lines)
      })
    }

    canvas.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    function onKey(event) {
      keys.add(event.code)
    }
    function onKeyUp(event) {
      keys.delete(event.code)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)

    let last = performance.now()
    let raf = 0
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const app = studioRef.current
      if (flying) {
        const u = Math.min(1, (now - flying.started) / 680)
        const eased = u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2
        camera.position.lerpVectors(flying.fromP, flying.position, eased)
        controls.target.lerpVectors(flying.fromT, flying.target, eased)
        if (u >= 1) flying = null
      } else if (play.current) stepPlay(dt)
      else if (app.presentation === 'walk') stepWalk(dt)
      if (app.presentation === 'plan') {
        controls.minPolarAngle = 0
        controls.maxPolarAngle = 0.42
      } else if (lookingInside()) {
        controls.minPolarAngle = 0.05
        controls.maxPolarAngle = Math.PI - 0.08
      } else {
        controls.minPolarAngle = 0
        controls.maxPolarAngle = Math.PI / 2 - 0.05
      }
      controls.autoRotate = Boolean(app.spin && app.presentation === 'orbit' && !flying)
      controls.enabled = app.presentation !== 'walk' && app.presentation !== 'play' && !flying && !sizing.id && !move.id && !glance.armed
      if (controls.enabled) controls.update()
      const piece = selectedFurniture()
      if (piece) showGizmo(piece)
      else hideGizmo()
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      if (compassRef.current) compassRef.current.style.transform = `rotate(${Math.atan2(direction.x, direction.z)}rad)`
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    actionsRef.current = {
      rebuild,
      applyFilters,
      highlight,
      fly,
      startPlay,
      enterWalk,
      finishPlay,
      drop,
      nudgeLook,
      finishConduit,
      cancel() {
        draft.anchor = null
        draft.conduit = []
        move.id = null
        if (sizing.id) {
          const object = findOwned(content, sizing.id)
          if (object) object.scale.set(1, 1, 1)
        }
        sizing.id = null
        sizing.dims = null
        sizing.pos = null
        sizing.base = null
        canvas.style.cursor = ''
        setConduitCount(0)
        clearPreview()
        setHud('')
      },
    }
    fly('orbit')

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      stopRecorder()
      controls.dispose()
      clearGizmo()
      for (const material of Object.values(handleMaterial)) material.dispose()
      boxMaterial.dispose()
      clearContent(content)
      clearPreview()
      renderer.dispose()
    }
  }, [])

  const visualKey = useMemo(
    () => JSON.stringify({
      elements: studio.project.elements,
      levels: studio.project.levels,
      roof: studio.project.roof,
      site: studio.project.site,
    }),
    [studio.project],
  )

  useEffect(() => {
    actionsRef.current.rebuild?.()
    actionsRef.current.applyFilters?.()
    actionsRef.current.highlight?.()
  }, [visualKey])

  useEffect(() => {
    actionsRef.current.applyFilters?.()
  }, [studio.presentation, studio.style, studio.showAllLevels, studio.project.activeLevelId])

  useEffect(() => {
    actionsRef.current.highlight?.()
  }, [studio.selection, studio.project])

  useEffect(() => {
    const actions = actionsRef.current
    if (!actions.fly) return
    if (studio.presentation === 'play') actions.startPlay()
    else if (studio.presentation === 'walk') actions.enterWalk()
    else actions.fly(studio.presentation)
  }, [studio.presentation, studio.frameToken])

  useEffect(() => {
    if (keepDraft.current) {
      keepDraft.current = false
      return
    }
    actionsRef.current.cancel?.()
  }, [studio.tool.id])

  studio.stage.dropAt = (clientX, clientY, payload) => actionsRef.current.drop?.(clientX, clientY, payload)
  studio.stage.finishConduit = () => actionsRef.current.finishConduit?.()
  studio.stage.cancelDraft = () => actionsRef.current.cancel?.()

  const level = levelById(studio.project, studio.project.activeLevelId)
  const lookTimer = useRef(0)

  function holdLook(event, yaw, pitch) {
    event.preventDefault()
    event.stopPropagation()
    window.clearInterval(lookTimer.current)
    const tick = () => actionsRef.current.nudgeLook?.(yaw, pitch)
    tick()
    lookTimer.current = window.setInterval(tick, 90)
    const stop = () => window.clearInterval(lookTimer.current)
    event.currentTarget.addEventListener('pointerup', stop, { once: true })
    event.currentTarget.addEventListener('pointercancel', stop, { once: true })
  }

  return (
    <div className="viewport" ref={wrapRef}>
      <canvas ref={canvasRef} />
      {webglError && <p className="viewport-error">{webglError}</p>}
      <div className="float-tools">
        <button type="button" className={studio.presentation === 'orbit' ? 'on' : ''} onClick={() => studio.setPresentation('orbit')}>
          หมุน 360
        </button>
        <button type="button" className={studio.spin ? 'on' : ''} onClick={() => { studio.setPresentation('orbit'); studio.setSpin((value) => !value) }}>
          หมุนเอง
        </button>
        <button type="button" className={studio.presentation === 'plan' ? 'on' : ''} onClick={() => studio.setPresentation('plan')}>
          แปลน
        </button>
        <button type="button" className={studio.presentation === 'exterior' ? 'on' : ''} onClick={() => studio.setPresentation('exterior')}>
          ภายนอก
        </button>
        <button type="button" className={studio.presentation === 'interior' ? 'on' : ''} onClick={() => studio.setPresentation('interior')}>
          ภายใน
        </button>
        <button type="button" className={studio.presentation === 'walk' ? 'on' : ''} onClick={() => studio.setPresentation('walk')}>
          เดินชม
        </button>
        <button type="button" className={studio.presentation === 'play' ? 'on' : ''} onClick={() => studio.setPresentation(studio.presentation === 'play' ? 'interior' : 'play')}>
          {studio.presentation === 'play' ? 'หยุดวิดีโอ' : 'เล่นเดินใน'}
        </button>
        <label className="record-toggle">
          <input type="checkbox" checked={studio.recordWalk} onChange={(event) => studio.setRecordWalk(event.target.checked)} />
          อัดวิดีโอ
        </label>
      </div>
      <div className="level-float">
        {studio.project.levels.map((item) => (
          <button key={item.id} type="button" className={item.id === level.id ? 'on' : ''} onClick={() => studio.setActiveLevel(item.id)}>
            {item.name}
          </button>
        ))}
        <button type="button" onClick={() => studio.setShowAllLevels((value) => !value)}>
          {studio.showAllLevels ? 'ทุกชั้น' : 'เฉพาะชั้นนี้'}
        </button>
      </div>
      <div className="style-float">
        <button type="button" className={studio.style === 'full' ? 'on' : ''} onClick={() => studio.setStyle('full')}>ทั้งอาคาร</button>
        <button type="button" className={studio.style === 'structure' ? 'on' : ''} onClick={() => studio.setStyle('structure')}>โครงสร้าง</button>
        <button type="button" className={studio.style === 'architecture' ? 'on' : ''} onClick={() => studio.setStyle('architecture')}>สถาปัตย์</button>
      </div>
      <div className="compass" ref={compassRef} title="ทิศ">
        <span>น</span>
      </div>
      <div className="look-pad" aria-label="หมุนมุมมอง">
        <button type="button" className="look-up" title="มองขึ้น" aria-label="มองขึ้น" onPointerDown={(event) => holdLook(event, 0, 0.1)}>↑</button>
        <button type="button" className="look-left" title="หมุนซ้าย" aria-label="หมุนซ้าย" onPointerDown={(event) => holdLook(event, 0.14, 0)}>←</button>
        <button type="button" className="look-right" title="หมุนขวา" aria-label="หมุนขวา" onPointerDown={(event) => holdLook(event, -0.14, 0)}>→</button>
        <button type="button" className="look-down" title="มองลง" aria-label="มองลง" onPointerDown={(event) => holdLook(event, 0, -0.1)}>↓</button>
      </div>
      <p className="hud" ref={hudRef}>
        {studio.presentation === 'walk'
          ? 'ลากเมาส์เพื่อหันหน้า · W A S D เดิน · Shift เร็วขึ้น · Esc ออก'
          : studio.presentation === 'interior'
            ? 'ลากเมาส์เพื่อหมุนมองรอบห้อง · ปุ่มลูกศรหมุนทีละมุม'
            : 'กริด 1 ม. · ซูมเข้าในห้องแล้วลากเมาส์หรือกดปุ่มลูกศรเพื่อหมุนมอง'}
      </p>
      {studio.tool.id === 'conduit' && (
        <div className="conduit-bar">
          {[
            ['ceiling', 'เดินบนฝ้า'],
            ['switch', 'ระดับสวิตช์'],
            ['outlet', 'ระดับเต้ารับ'],
          ].map(([id, label]) => (
            <button key={id} type="button" className={conduitMode === id ? 'on' : ''} onClick={() => setConduitMode(id)}>
              {label}
            </button>
          ))}
          <button type="button" className="primary" onClick={() => actionsRef.current.finishConduit?.()}>
            จบแนวท่อ{conduitCount ? ` (${conduitCount})` : ''}
          </button>
        </div>
      )}
    </div>
  )
}

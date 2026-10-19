import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyProject } from '../data/templates.js'
import { pasteElement } from './mutate.js'

test('วางชิ้นที่คัดลอกได้ชิ้นใหม่และเยื้องจากต้นฉบับ', () => {
  const project = emptyProject()
  project.elements = [{ id: 'a', type: 'furniture', levelId: project.levels[0].id, kind: 'sofa', x: 1, z: 2, w: 2, d: 1, h: 1, rot: 0 }]
  const id = pasteElement(project, project.elements[0], 1)
  const copy = project.elements.find((item) => item.id === id)
  assert.notEqual(id, 'a')
  assert.equal(project.elements.length, 2)
  assert.equal(copy.x, 2)
  assert.equal(copy.z, 3)
  assert.equal(copy.kind, 'sofa')
  assert.equal(pasteElement(project, { type: 'door', wallId: 'w', t: 0.5, width: 1, height: 2 }, 0.5), null)
})

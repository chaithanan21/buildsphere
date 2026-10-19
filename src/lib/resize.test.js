import test from 'node:test'
import assert from 'node:assert/strict'
import { dimensionsFromDrag, resizeFromEdge, samePose, sameSize, snapDim } from './resize.js'

const base = { w: 2, d: 1, h: 1, span: 2 }

test('ลากด้านกว้างคิดจากระยะถึงจุดกึ่งกลาง', () => {
  const next = dimensionsFromDrag(base, 'w', 1.5)
  assert.equal(next.w, 3)
  assert.equal(next.d, 1)
  assert.equal(next.h, 1)
})

test('ลากความสูงและขนาดทั้งชิ้นแล้วsnap ทีละ 5 ซม.', () => {
  assert.equal(dimensionsFromDrag(base, 'h', 2.22).h, 2.2)
  const scaled = dimensionsFromDrag(base, 'u', 4)
  assert.deepEqual({ w: scaled.w, d: scaled.d, h: scaled.h }, { w: 4, d: 2, h: 2 })
  assert.equal(snapDim(0.33), 0.35)
})

test('ย่อเกินขอบเขตแล้วหยุดที่ขนาดต่ำสุด', () => {
  const next = dimensionsFromDrag(base, 'w', 0.01)
  assert.equal(next.w, 0.2)
  assert.equal(sameSize(base, { w: 2, d: 1, h: 1 }), true)
  assert.equal(sameSize(base, next), false)
})

test('ดึงขอบกว้างหรือยาว แล้วขอบตรงข้ามอยู่กับที่', () => {
  const wider = resizeFromEdge(base, 'w', 1, 1.5)
  assert.equal(wider.w, 2.5)
  assert.equal(wider.d, 1)
  assert.equal(wider.shift, 0.25)
  const longer = resizeFromEdge(base, 'd', -1, -1.2)
  assert.equal(longer.d, 1.7)
  assert.equal(longer.w, 2)
  assert.equal(longer.shift, -0.35)
  assert.equal(samePose({ ...base, x: 1, z: 2 }, { w: 2, d: 1, h: 1, x: 1, z: 2 }), true)
})

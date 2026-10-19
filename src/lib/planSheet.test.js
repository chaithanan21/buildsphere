import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyProject, houseProject } from '../data/templates.js'
import { boqHtml } from './exportBoq.js'
import { planHtml } from './planSheet.js'

test('ใบพิมพ์ BOQ มีตารางและยอดรวม โดยไม่เปิดป๊อปอัป', () => {
  const html = boqHtml(houseProject())
  assert.match(html, /บัญชีแสดงปริมาณและราคาตั้งต้น/)
  assert.match(html, /รวมค่างานก่อสร้าง/)
  assert.match(html, /งานฐานราก/)
  assert.equal(html.includes('window.open'), false)
})

test('แปลนบ้านพิมพ์ครบทุกชั้น พร้อมประตู หน้าต่าง และชื่อห้อง', () => {
  const html = planHtml(houseProject())
  assert.equal(html.match(/<section class="sheet"/g).length, 2)
  assert.match(html, /แปลนชั้น 1/)
  assert.match(html, /แปลนชั้น 2/)
  assert.match(html, /ห้องนั่งเล่น/)
  assert.match(html, /ห้องนอน 1/)
  assert.match(html, /class="door"/)
  assert.match(html, /class="window"/)
  assert.match(html, /เหนือ/)
  assert.match(html, /8\.15 ม\./)
  assert.match(html, /10\.15 ม\./)
})

test('ที่ดินว่างบอกว่ายังไม่มีแปลน', () => {
  const html = planHtml(emptyProject())
  assert.match(html, /ยังไม่มีผนังหรือพื้นให้พิมพ์แปลน/)
  assert.equal(html.includes('<svg'), false)
})

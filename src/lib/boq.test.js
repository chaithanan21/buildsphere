import test from 'node:test'
import assert from 'node:assert/strict'
import { engineeringElement, roomAssembly } from './assemble.js'
import { computeBoq } from './boq.js'
import { emptyProject, factoryProject, houseProject, validateProject } from '../data/templates.js'

test('ที่ดินว่างยังไม่มีปริมาณ', () => {
  const boq = computeBoq(emptyProject())
  assert.equal(boq.constructionTotal, 0)
  assert.equal(boq.floorArea, 0)
})

test('ห้องทั้งชุดได้ผนัง พื้น เสา และคาน', () => {
  const project = emptyProject()
  const level = project.levels[0]
  const elements = roomAssembly(project, level, { x: 0, z: 0, w: 6, d: 4 })
  assert.equal(elements.filter((item) => item.type === 'wall').length, 4)
  assert.equal(elements.filter((item) => item.type === 'slab').length, 1)
  assert.ok(elements.some((item) => item.type === 'column'))
  assert.ok(elements.some((item) => item.type === 'beam'))
  project.elements = elements
  const boq = computeBoq(project)
  assert.ok(boq.headline.concrete > 0)
  assert.ok(boq.floorArea >= 24)
})

test('บ้านสองชั้นมีโครงสร้าง หลังคา ไฟ และช่องเปิดที่อยู่ในผนัง', () => {
  const house = houseProject()
  validateProject(house)
  const boq = computeBoq(house)
  assert.ok(boq.headline.concrete > 5)
  assert.ok(boq.headline.floorArea > 100)
  assert.ok(boq.headline.conduit > 1)
  assert.ok(boq.trades.some((trade) => trade.name === 'หลังคา' && trade.lines[0].net > boq.floorArea * 0.2))
  assert.ok(boq.trades.some((trade) => trade.name === 'ระบบไฟฟ้า'))
  assert.equal(house.levels[1].elevation, 3.2)
})

test('โรงงานคิดเหล็ก พื้นอีพ็อกซี และแบ่งโซน', () => {
  const factory = factoryProject()
  validateProject(factory)
  const boq = computeBoq(factory)
  const names = boq.trades.flatMap((trade) => trade.lines.map((line) => line.name))
  assert.ok(names.some((name) => name.includes('เสาเหล็ก')))
  assert.ok(names.some((name) => name.includes('อีพ็อกซี')))
  assert.ok(factory.elements.filter((item) => item.type === 'label').length >= 4)
  assert.equal(factory.roof.type, 'flat')
})

test('เผื่อวัสดุคูณเฉพาะหน่วยวัด ไม่คูณจำนวนชุด', () => {
  const house = houseProject()
  house.waste = 0.1
  const boq = computeBoq(house)
  const door = boq.trades.flatMap((trade) => trade.lines).find((line) => line.unit === 'ชุด')
  const wall = boq.trades.flatMap((trade) => trade.lines).find((line) => line.unit === 'ตร.ม.' && line.name.includes('ผนัง'))
  assert.equal(door.qty, door.net)
  assert.ok(Math.abs(wall.qty - wall.net * 1.1) < 0.001)
})

test('งานฐานรากและพื้นโครงสร้างแยกหมวด และเสาเข็มคิดเป็นเมตร', () => {
  const project = emptyProject()
  const level = project.levels[0]
  project.elements = [
    engineeringElement(level, 'pad', { x: 0, z: 0 }),
    engineeringElement(level, 'pile', { x: 1, z: 0 }),
    engineeringElement(level, 'sog', { x: 2, z: 2, w: 4, d: 3 }),
    engineeringElement(level, 'precast', { x: 0, z: 4, w: 3, d: 2 }),
    engineeringElement(level, 'strip', { x1: 0, z1: 0, x2: 4, z2: 0 }),
  ]
  const boq = computeBoq(project)
  const lines = boq.trades.flatMap((trade) => trade.lines)
  const pad = lines.find((item) => item.name === 'ฐานรากเดี่ยว')
  const pile = lines.find((item) => item.name === 'เสาเข็ม')
  const sog = lines.find((item) => item.name === 'พื้นวางบนดิน')
  const precast = lines.find((item) => item.name === 'พื้นสำเร็จรูป')
  const strip = lines.find((item) => item.name === 'ฐานรากต่อเนื่อง')
  assert.ok(boq.trades.some((trade) => trade.name === 'งานฐานราก'))
  assert.ok(boq.trades.some((trade) => trade.name === 'งานพื้น'))
  assert.equal(pad.unit, 'ลบ.ม.')
  assert.ok(Math.abs(pad.net - 1.2 * 1.2 * 0.4) < 0.001)
  assert.equal(pile.unit, 'ม.')
  assert.ok(Math.abs(pile.net - 12) < 0.001)
  assert.ok(Math.abs(sog.net - 4 * 3 * 0.15) < 0.001)
  assert.equal(precast.unit, 'ตร.ม.')
  assert.ok(Math.abs(precast.net - 6) < 0.001)
  assert.ok(Math.abs(strip.net - 4 * 0.6 * 0.4) < 0.001)
  assert.equal(boq.headline.concrete, 0)
})

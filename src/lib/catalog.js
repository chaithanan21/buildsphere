export const MATERIALS = [
  { id: 'plaster', name: 'ฉาบเรียบ', group: 'ผนัง', color: '#f3f0e8', roughness: 0.92, metalness: 0, opacity: 1, pattern: 'noise' },
  { id: 'paint-white', name: 'สีขาว', group: 'ผนัง', color: '#f7f6f2', roughness: 0.88, metalness: 0, opacity: 1, pattern: 'solid' },
  { id: 'paint-sand', name: 'สีทราย', group: 'ผนัง', color: '#e4d0b0', roughness: 0.9, metalness: 0, opacity: 1, pattern: 'solid' },
  { id: 'paint-sage', name: 'สีเขียวเทา', group: 'ผนัง', color: '#c5d0c4', roughness: 0.9, metalness: 0, opacity: 1, pattern: 'solid' },
  { id: 'brick', name: 'อิฐโชว์แนว', group: 'ผนัง', color: '#a3543c', roughness: 0.86, metalness: 0, opacity: 1, pattern: 'brick' },
  { id: 'concrete-fair', name: 'คอนกรีตเปลือย', group: 'ผนัง', color: '#c8c2b8', roughness: 0.78, metalness: 0.02, opacity: 1, pattern: 'noise' },
  { id: 'wood-wall', name: 'ผนังไม้', group: 'ผนัง', color: '#b5835a', roughness: 0.62, metalness: 0, opacity: 1, pattern: 'wood' },
  { id: 'glass', name: 'กระจก', group: 'ผนัง', color: '#c5dde6', roughness: 0.08, metalness: 0.04, opacity: 0.38, pattern: 'solid' },
  { id: 'panel', name: 'เมทัลชีทผนัง', group: 'ผนัง', color: '#d5d8dc', roughness: 0.42, metalness: 0.35, opacity: 1, pattern: 'ridge' },
  { id: 'tile-sand', name: 'กระเบื้องทราย', group: 'พื้น', color: '#e7d7c3', roughness: 0.55, metalness: 0.02, opacity: 1, pattern: 'tile' },
  { id: 'tile-white', name: 'กระเบื้องขาว', group: 'พื้น', color: '#f4f2ed', roughness: 0.45, metalness: 0.03, opacity: 1, pattern: 'tile' },
  { id: 'wood-floor', name: 'พื้นไม้', group: 'พื้น', color: '#a8724a', roughness: 0.5, metalness: 0, opacity: 1, pattern: 'wood' },
  { id: 'epoxy', name: 'อีพ็อกซี', group: 'พื้น', color: '#8aa0a8', roughness: 0.28, metalness: 0.08, opacity: 1, pattern: 'solid' },
  { id: 'concrete-floor', name: 'พื้นขัดมัน', group: 'พื้น', color: '#bdb6ad', roughness: 0.34, metalness: 0.04, opacity: 1, pattern: 'noise' },
  { id: 'roof-tile', name: 'กระเบื้องหลังคา', group: 'หลังคา', color: '#8e3d32', roughness: 0.72, metalness: 0, opacity: 1, pattern: 'tile' },
  { id: 'roof-metal', name: 'เมทัลชีทหลังคา', group: 'หลังคา', color: '#8e99a4', roughness: 0.35, metalness: 0.55, opacity: 1, pattern: 'ridge' },
]

export const MATERIAL_MAP = Object.fromEntries(MATERIALS.map((item) => [item.id, item]))

export const FURNITURE = {
  sofa: { name: 'โซฟา', w: 2.1, d: 0.9, h: 0.82 },
  bed: { name: 'เตียง', w: 1.6, d: 2.1, h: 0.7 },
  table: { name: 'โต๊ะอาหาร', w: 1.5, d: 0.9, h: 0.76 },
  chair: { name: 'เก้าอี้', w: 0.48, d: 0.5, h: 0.9 },
  desk: { name: 'โต๊ะทำงาน', w: 1.4, d: 0.7, h: 0.75 },
  wardrobe: { name: 'ตู้เสื้อผ้า', w: 1.2, d: 0.58, h: 2.15 },
  kitchen: { name: 'เคาน์เตอร์ครัว', w: 2.4, d: 0.62, h: 0.9 },
  shelf: { name: 'ชั้นวางของ', w: 2, d: 0.5, h: 2 },
  plant: { name: 'ต้นไม้', w: 0.7, d: 0.7, h: 1.6 },
  machine: { name: 'เครื่องจักร', w: 2.2, d: 1.15, h: 1.7 },
  person: { name: 'คนสัดส่วน 1.75 ม.', w: 0.46, d: 0.32, h: 1.75 },
}

export const DEFAULT_RATES = {
  concrete_m3: 4500,
  steel_column_m: 2200,
  steel_beam_m: 1900,
  masonry_m2: 780,
  brick_m2: 1100,
  concrete_wall_m2: 1450,
  glass_m2: 3200,
  panel_m2: 950,
  wood_wall_m2: 1800,
  paint_m2: 160,
  floor_tile_m2: 980,
  wood_floor_m2: 1650,
  epoxy_m2: 720,
  concrete_floor_m2: 450,
  door_set: 7500,
  window_m2: 4800,
  roof_tile_m2: 1250,
  roof_metal_m2: 890,
  conduit_m: 95,
  elbow: 35,
  junction: 120,
  outlet: 280,
  switch: 250,
  light: 950,
  stair_step: 850,
  railing_m: 1400,
  furnish: 3500,
  pile_m: 2800,
  lean_m3: 1800,
  sand_m3: 650,
  precast_m2: 890,
}

export const ENGINEERING = {
  pile: { name: 'เสาเข็ม', phase: 'foundation', mode: 'point', w: 0.35, d: 0.35, h: 12, measure: 'm', rateKey: 'pile_m', trade: 'งานฐานราก', hint: 'คลิกวาง ขอบส้มปรับขนาดหน้าตัด ความยาวแก้ในแถบขวา' },
  'pile-cap': { name: 'แป้นหัวเข็ม', phase: 'foundation', mode: 'point', w: 1, d: 1, h: 0.45, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานฐานราก', hint: 'คลิกวางบนกลุ่มเสาเข็ม แล้วลากขอบปรับกว้างยาว' },
  pad: { name: 'ฐานรากเดี่ยว', phase: 'foundation', mode: 'point', w: 1.2, d: 1.2, h: 0.4, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานฐานราก', hint: 'คลิกวาง แล้วลากขอบส้มปรับกว้าง ขอบเขียวปรับยาว' },
  strip: { name: 'ฐานรากต่อเนื่อง', phase: 'foundation', mode: 'line', w: 0.6, d: 0.6, h: 0.4, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานฐานราก', hint: 'ลากแนวฐาน ความกว้างและความลึกแก้ในแถบขวา' },
  raft: { name: 'ฐานรากแพ', phase: 'foundation', mode: 'rect', w: 6, d: 6, h: 0.35, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานฐานราก', hint: 'ลากเป็นผืน แล้วลากขอบปรับขนาด' },
  lean: { name: 'คอนกรีตหยาบ', phase: 'foundation', mode: 'rect', w: 6, d: 6, h: 0.05, measure: 'm3', rateKey: 'lean_m3', trade: 'งานฐานราก', hint: 'ลากผืนคอนกรีตหยาบใต้ฐาน' },
  sand: { name: 'ทรายรองพื้น', phase: 'foundation', mode: 'rect', w: 6, d: 6, h: 0.1, measure: 'm3', rateKey: 'sand_m3', trade: 'งานฐานราก', hint: 'ลากผืนทรายรองพื้น' },
  stump: { name: 'เสาตอม่อ', phase: 'foundation', mode: 'point', w: 0.3, d: 0.3, h: 1, up: true, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานฐานราก', hint: 'คลิกวางตอม่อโผล่เหนือระดับพื้น' },
  'ground-beam': { name: 'คานคอดิน', phase: 'foundation', mode: 'line', w: 0.25, d: 0.25, h: 0.4, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานฐานราก', hint: 'ลากแนวคานคอดิน' },
  sog: { name: 'พื้นวางบนดิน', phase: 'eng-floor', mode: 'rect', w: 6, d: 6, h: 0.15, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานพื้น', hint: 'ลากผืนพื้นโครงสร้างบนดิน ไม่รวมผิวสถาปัตย์' },
  precast: { name: 'พื้นสำเร็จรูป', phase: 'eng-floor', mode: 'rect', w: 4, d: 4, h: 0.05, measure: 'm2', rateKey: 'precast_m2', trade: 'งานพื้น', hint: 'ลากพื้นที่พื้นสำเร็จรูป คิดเป็นตารางเมตร' },
  topping: { name: 'คอนกรีตทับหน้า', phase: 'eng-floor', mode: 'rect', w: 4, d: 4, h: 0.05, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานพื้น', hint: 'ลากผืนคอนกรีตทับหน้าบนพื้นสำเร็จรูป' },
  retaining: { name: 'ผนังกันดิน', phase: 'eng-other', mode: 'line', w: 0.25, d: 0.25, h: 2.4, up: true, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานโครงสร้าง', hint: 'ลากแนวกำแพงกันดิน' },
  'machine-pad': { name: 'ฐานเครื่องจักร', phase: 'eng-other', mode: 'point', w: 1.6, d: 1.2, h: 0.3, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานโครงสร้าง', hint: 'คลิกวางฐานเครื่อง แล้วลากขอบปรับกว้างยาว' },
  'shear-wall': { name: 'ผนังรับแรง', phase: 'eng-other', mode: 'line', w: 0.2, d: 0.2, h: 3, up: true, measure: 'm3', rateKey: 'concrete_m3', trade: 'งานโครงสร้าง', hint: 'ลากแนวผนังรับแรงเฉือน' },
}

export const MASONRY_FINISHES = new Set(['plaster', 'paint-white', 'paint-sand', 'paint-sage'])

export const CLADDING_RATE = {
  brick: 'brick_m2',
  'concrete-fair': 'concrete_wall_m2',
  glass: 'glass_m2',
  panel: 'panel_m2',
  'wood-wall': 'wood_wall_m2',
}

export const FLOOR_RATE = {
  'tile-sand': 'floor_tile_m2',
  'tile-white': 'floor_tile_m2',
  'wood-floor': 'wood_floor_m2',
  epoxy: 'epoxy_m2',
  'concrete-floor': 'concrete_floor_m2',
  plaster: 'concrete_floor_m2',
  'paint-white': 'floor_tile_m2',
  'paint-sand': 'floor_tile_m2',
  'paint-sage': 'floor_tile_m2',
}

export const ROOF_RATE = {
  'roof-tile': 'roof_tile_m2',
  'roof-metal': 'roof_metal_m2',
}

export const PHASES = [
  { id: 'shell', name: 'ผนังและพื้น' },
  { id: 'structure', name: 'โครงสร้าง' },
  { id: 'foundation', name: 'งานฐานราก' },
  { id: 'eng-floor', name: 'พื้นโครงสร้าง' },
  { id: 'eng-other', name: 'งานโครงสร้างอื่น' },
  { id: 'openings', name: 'ช่องเปิด' },
  { id: 'systems', name: 'ระบบภายใน' },
  { id: 'furnish', name: 'ตกแต่ง' },
]

export const TOOLS = [
  { id: 'select', phase: 'all', name: 'เลือก', hint: 'คลิกเพื่อเลือก ลากชิ้นงานเพื่อย้าย Ctrl+C คัดลอก Ctrl+V วาง', shortcut: 'V' },
  { id: 'room', phase: 'shell', name: 'ห้องทั้งชุด', hint: 'ลากเป็นสี่เหลี่ยม แล้วได้ผนัง พื้น เสา และคานในครั้งเดียว', shortcut: 'B', primary: true },
  { id: 'wall', phase: 'shell', name: 'ผนัง', hint: 'ลากหรือคลิกสองจุดบนผัง', shortcut: 'W' },
  { id: 'slab', phase: 'shell', name: 'พื้น', hint: 'ลากผิวพื้นสถาปัตย์ ปริมาณคิดเป็นตารางเมตรผิวและปริมาตรคอนกรีตพื้น' },
  { id: 'column', phase: 'structure', name: 'เสา', hint: 'คลิกจุดวางเสา เลือกคอนกรีตหรือเหล็กได้จากแถบบน' },
  { id: 'beam', phase: 'structure', name: 'คาน', hint: 'ลากจากจุดหนึ่งไปอีกจุด ความยาวหักช่วงที่ชนเสาให้แล้ว' },
  { id: 'stair', phase: 'structure', name: 'บันได', hint: 'ลากพื้นที่บันได แล้วเดินขึ้นได้ในโหมดเดินชม' },
  ...Object.entries(ENGINEERING).map(([kind, spec]) => ({
    id: 'engineering',
    kind,
    phase: spec.phase,
    name: spec.name,
    hint: spec.hint,
  })),
  { id: 'door', phase: 'openings', name: 'ประตู', hint: 'คลิกบนผนังเพื่อวาง คลิกประตูที่มีอยู่แล้วลากเลื่อนตามผนัง' },
  { id: 'window', phase: 'openings', name: 'หน้าต่าง', hint: 'คลิกบนผนังเพื่อวาง คลิกหน้าต่างที่มีอยู่แล้วลากเลื่อนตามผนัง' },
  { id: 'conduit', phase: 'systems', name: 'ท่อร้อยสาย', hint: 'คลิกทีละจุด Enter เพื่อจบแนว จุดหักนับเป็นข้อต่อ', shortcut: 'E' },
  { id: 'junction', phase: 'systems', name: 'กล่องพักสาย', hint: 'คลิกวางที่ระดับฝ้า' },
  { id: 'outlet', phase: 'systems', name: 'เต้ารับ', hint: 'คลิกใกล้ผนัง จะเกาะที่ความสูง 0.35 ม.' },
  { id: 'switch', phase: 'systems', name: 'สวิตช์', hint: 'คลิกใกล้ผนัง จะเกาะที่ความสูง 1.20 ม.' },
  { id: 'light', phase: 'systems', name: 'ดวงโคม', hint: 'คลิกวางที่ระดับฝ้า' },
  ...Object.entries(FURNITURE).map(([kind, spec]) => ({
    id: 'furniture',
    kind,
    phase: 'furnish',
    name: spec.name,
    hint: 'วางบนพื้น แล้วลากตัวชิ้นงานเพื่อย้าย ลากขอบส้มปรับกว้าง ลากขอบเขียวปรับยาว',
  })),
]

export function materialById(id) {
  return MATERIAL_MAP[id] || MATERIAL_MAP.plaster
}

export function coachFor(project) {
  const hasWall = project.elements.some((el) => el.type === 'wall')
  const hasRoof = project.roof.type !== 'none'
  const hasPower = project.elements.some((el) => el.type === 'conduit' || el.type === 'light' || el.type === 'device')
  const hasFurn = project.elements.some((el) => el.type === 'furniture')
  if (!hasWall) {
    return 'ลาก «ห้องทั้งชุด» ลงบนที่ดิน จะได้ผนัง พื้น เสา และคานพร้อมกัน แล้วปริมาณด้านขวาขยับทันที'
  }
  if (!hasRoof) return 'ตั้งหลังคา แล้วสลับมุมมองภายนอกหรือภายในได้ทันที'
  if (!hasPower) return 'ลากท่อสีเหลืองบนฝ้า แล้ววางดวงโคมกับเต้ารับ ความยาวและข้อต่อเข้ารายการไฟฟ้าเอง'
  if (!hasFurn) return 'วางเฟอร์นิเจอร์จากคลัง แล้วกดเดินชมหรืออัดวิดีโอเดินในอาคาร'
  return 'ปริมาณอัปเดตจากโมเดลแล้ว ส่งออก CSV พิมพ์ BOQ หรือพิมพ์แปลนทั้งหลังได้จากแถบบน'
}

import {
  CLADDING_RATE,
  DEFAULT_RATES,
  ENGINEERING,
  FLOOR_RATE,
  FURNITURE,
  MASONRY_FINISHES,
  ROOF_RATE,
  materialById,
} from './catalog.js'
import {
  buildingBounds,
  dist2,
  elbowCount,
  polylineLength,
  roofMetrics,
  wallLength,
} from './geometry.js'

const MEASURED = new Set(['ม.', 'ตร.ม.', 'ลบ.ม.'])

export function computeBoq(project) {
  const rates = { ...DEFAULT_RATES, ...project.rates }
  const waste = Number.isFinite(project.waste) ? project.waste : 0.05
  const paintSides = project.paintSides === 1 ? 1 : 2
  const lines = []

  const concrete = { volume: 0 }
  let steelColumns = 0
  let steelBeams = 0
  const columns = project.elements.filter((el) => el.type === 'column')

  for (const column of columns) {
    const level = project.levels.find((item) => item.id === column.levelId)
    const height = level?.height ?? 3
    if (column.material === 'steel') steelColumns += height
    else concrete.volume += column.w * column.d * height
  }

  for (const beam of project.elements.filter((el) => el.type === 'beam')) {
    const length = clearBeamLength(beam, columns)
    if (beam.material === 'steel') steelBeams += length
    else concrete.volume += beam.w * beam.h * length
  }

  for (const slab of project.elements.filter((el) => el.type === 'slab')) {
    concrete.volume += slab.w * slab.d * slab.thickness
  }

  if (concrete.volume > 0.001) {
    lines.push(line('โครงสร้าง', 'คอนกรีตโครงสร้าง เสา คาน และพื้น', 'ลบ.ม.', concrete.volume, 'concrete_m3'))
  }
  if (steelColumns > 0.01) {
    lines.push(line('โครงสร้าง', 'เสาเหล็ก ตามความสูงชั้น', 'ม.', steelColumns, 'steel_column_m'))
  }
  if (steelBeams > 0.01) {
    lines.push(line('โครงสร้าง', 'คานเหล็ก หักช่วงชนเสา', 'ม.', steelBeams, 'steel_beam_m'))
  }

  const wallBuckets = new Map()
  let paint = 0
  let railing = 0
  for (const wall of project.elements.filter((el) => el.type === 'wall')) {
    const gross = wallLength(wall) * wall.height
    const opening = openingArea(project, wall)
    const net = Math.max(0, gross - opening)
    if (wall.height <= 1.25) {
      railing += wallLength(wall)
      continue
    }
    if (MASONRY_FINISHES.has(wall.finish)) {
      addBucket(wallBuckets, 'masonry', 'ผนังก่อฉาบ', 'ตร.ม.', 'masonry_m2', net)
      paint += net * paintSides
    } else {
      const rateKey = CLADDING_RATE[wall.finish] || 'masonry_m2'
      const name = `ผนัง${materialById(wall.finish).name}`
      addBucket(wallBuckets, wall.finish, name, 'ตร.ม.', rateKey, net)
    }
  }
  for (const bucket of wallBuckets.values()) {
    lines.push(line('สถาปัตยกรรม', bucket.name, bucket.unit, bucket.qty, bucket.rateKey))
  }
  if (paint > 0.01) {
    lines.push(line('สถาปัตยกรรม', `ทาสีผนัง ${paintSides} ด้าน`, 'ตร.ม.', paint, 'paint_m2'))
  }
  if (railing > 0.01) lines.push(line('สถาปัตยกรรม', 'ราวกันตก / ผนังเตี้ย', 'ม.', railing, 'railing_m'))

  const floors = new Map()
  let floorArea = 0
  for (const slab of project.elements.filter((el) => el.type === 'slab')) {
    const area = slab.w * slab.d
    floorArea += area
    const rateKey = FLOOR_RATE[slab.finish] || 'floor_tile_m2'
    const name = `วัสดุปูพื้น ${materialById(slab.finish).name}`
    addBucket(floors, slab.finish, name, 'ตร.ม.', rateKey, area)
  }
  for (const bucket of floors.values()) {
    lines.push(line('งานผิวพื้น', bucket.name, bucket.unit, bucket.qty, bucket.rateKey))
  }

  const bounds = buildingBounds(project.elements.filter((el) => el.type === 'wall'))
  const roof = roofMetrics(bounds, project.roof)
  if (roof.surface > 0.01) {
    const rateKey = ROOF_RATE[project.roof.material] || 'roof_metal_m2'
    lines.push(
      line('หลังคา', `วัสดุมุง${materialById(project.roof.material).name} ไม่รวมโครงคาน`, 'ตร.ม.', roof.surface, rateKey),
    )
  }

  const doors = new Map()
  const windows = new Map()
  for (const opening of project.elements.filter((el) => el.type === 'door' || el.type === 'window')) {
    const key = `${opening.type}-${opening.width.toFixed(2)}-${opening.height.toFixed(2)}`
    const name =
      opening.type === 'door'
        ? `ประตู ${opening.width.toFixed(2)} × ${opening.height.toFixed(2)} ม.`
        : `หน้าต่าง ${opening.width.toFixed(2)} × ${opening.height.toFixed(2)} ม.`
    if (opening.type === 'door') addBucket(doors, key, name, 'ชุด', 'door_set', 1)
    else addBucket(windows, key, name, 'ตร.ม.', 'window_m2', opening.width * opening.height)
  }
  for (const bucket of doors.values()) lines.push(line('ช่องเปิด', bucket.name, bucket.unit, bucket.qty, bucket.rateKey))
  for (const bucket of windows.values()) lines.push(line('ช่องเปิด', bucket.name, bucket.unit, bucket.qty, bucket.rateKey))

  let conduit = 0
  let elbows = 0
  for (const run of project.elements.filter((el) => el.type === 'conduit')) {
    conduit += polylineLength(run.points || [])
    elbows += elbowCount(run.points || [])
  }
  const junctions = project.elements.filter((el) => el.type === 'junction').length
  const outlets = project.elements.filter((el) => el.type === 'device' && el.kind === 'outlet').length
  const switches = project.elements.filter((el) => el.type === 'device' && el.kind === 'switch').length
  const lights = project.elements.filter((el) => el.type === 'light').length
  if (conduit > 0.01) lines.push(line('ระบบไฟฟ้า', 'ท่อร้อยสาย PVC', 'ม.', conduit, 'conduit_m'))
  if (elbows) lines.push(line('ระบบไฟฟ้า', 'ข้อต่อท่อที่จุดหัก', 'จุด', elbows, 'elbow'))
  if (junctions) lines.push(line('ระบบไฟฟ้า', 'กล่องพักสาย', 'จุด', junctions, 'junction'))
  if (outlets) lines.push(line('ระบบไฟฟ้า', 'เต้ารับ', 'จุด', outlets, 'outlet'))
  if (switches) lines.push(line('ระบบไฟฟ้า', 'สวิตช์', 'จุด', switches, 'switch'))
  if (lights) lines.push(line('ระบบไฟฟ้า', 'ดวงโคม', 'จุด', lights, 'light'))

  const steps = project.elements.filter((el) => el.type === 'stair').reduce((sum, stair) => sum + stair.steps, 0)
  if (steps) lines.push(line('สถาปัตยกรรม', 'ขั้นบันได', 'ขั้น', steps, 'stair_step'))

  const engineering = new Map()
  for (const item of project.elements.filter((el) => el.type === 'engineering')) {
    const spec = ENGINEERING[item.kind]
    if (!spec) continue
    const unit = spec.measure === 'm' ? 'ม.' : spec.measure === 'm2' ? 'ตร.ม.' : 'ลบ.ม.'
    const qty = engineeringQuantity(item, spec)
    if (!engineering.has(item.kind)) {
      engineering.set(item.kind, { name: spec.name, unit, rateKey: spec.rateKey, trade: spec.trade, qty: 0 })
    }
    engineering.get(item.kind).qty += qty
  }
  for (const bucket of engineering.values()) {
    if (bucket.qty > 0.0001) lines.push(line(bucket.trade, bucket.name, bucket.unit, bucket.qty, bucket.rateKey))
  }

  const furnish = new Map()
  for (const item of project.elements.filter((el) => el.type === 'furniture' && el.kind !== 'person')) {
    const spec = FURNITURE[item.kind]
    addBucket(furnish, item.kind, spec?.name || item.kind, 'รายการ', 'furnish', 1)
  }
  for (const bucket of furnish.values()) lines.push(line('ตกแต่ง', bucket.name, bucket.unit, bucket.qty, bucket.rateKey))

  const trades = []
  for (const item of lines) {
    const qty = MEASURED.has(item.unit) ? item.net * (1 + waste) : item.net
    const rate = rates[item.rateKey] ?? 0
    const amount = qty * rate
    let trade = trades.find((group) => group.name === item.trade)
    if (!trade) {
      trade = { name: item.trade, lines: [], total: 0, furnish: item.trade === 'ตกแต่ง' }
      trades.push(trade)
    }
    trade.lines.push({ ...item, qty, rate, amount })
    trade.total += amount
  }

  const constructionTotal = trades.filter((trade) => !trade.furnish).reduce((sum, trade) => sum + trade.total, 0)
  const furnishTotal = trades.filter((trade) => trade.furnish).reduce((sum, trade) => sum + trade.total, 0)
  return {
    trades,
    rates,
    waste,
    paintSides,
    floorArea,
    constructionTotal,
    furnishTotal,
    headline: {
      floorArea,
      concrete: concrete.volume,
      conduit,
    },
  }
}

function engineeringQuantity(item, spec) {
  if (spec.mode === 'line') {
    const length = wallLength(item)
    if (spec.measure === 'm2') return length * (item.h || 0)
    if (spec.measure === 'm') return length
    return length * (item.w || 0) * (item.h || 0)
  }
  if (spec.measure === 'm') return item.h || 0
  if (spec.measure === 'm2') return (item.w || 0) * (item.d || 0)
  return (item.w || 0) * (item.d || 0) * (item.h || 0)
}

function clearBeamLength(beam, columns) {
  let length = dist2(beam.x1, beam.z1, beam.x2, beam.z2)
  for (const [x, z] of [
    [beam.x1, beam.z1],
    [beam.x2, beam.z2],
  ]) {
    const column = columns.find(
      (item) => item.levelId === beam.levelId && dist2(item.x, item.z, x, z) < Math.max(item.w, item.d),
    )
    if (column) length -= Math.min(length, column.w / 2)
  }
  return Math.max(0, length)
}

function openingArea(project, wall) {
  const length = wallLength(wall)
  return project.elements
    .filter((el) => (el.type === 'door' || el.type === 'window') && el.wallId === wall.id)
    .reduce((sum, opening) => {
      const width = Math.min(opening.width, length)
      const height = Math.min(opening.height, wall.height)
      return sum + width * height
    }, 0)
}

function addBucket(map, key, name, unit, rateKey, qty) {
  if (!map.has(key)) map.set(key, { name, unit, rateKey, qty: 0 })
  map.get(key).qty += qty
}

function line(trade, name, unit, net, rateKey) {
  return { trade, name, unit, net, rateKey }
}

export function formatQty(value) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatBaht(value) {
  return value.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })
}

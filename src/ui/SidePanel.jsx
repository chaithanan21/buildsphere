import { ENGINEERING, MATERIALS, coachFor, materialById } from '../lib/catalog.js'
import { computeBoq, formatBaht, formatQty } from '../lib/boq.js'
import { ENGINEERING_LIMIT, clampDim, snapDim } from '../lib/resize.js'
import { useStudio } from '../state/store.jsx'

export default function SidePanel() {
  const studio = useStudio()
  const { project } = studio
  const boq = computeBoq(project)
  const selected = project.elements.find((item) => item.id === studio.selection) || (studio.selection === 'roof' ? { ...project.roof, id: 'roof', type: 'roof' } : null)
  const labels = project.elements.filter((item) => item.type === 'label')

  return (
    <aside className="side">
      <section className="coach">
        <p>{coachFor(project)}</p>
      </section>

      <section>
        <h2>{selected ? titleOf(selected) : 'แปลงและชั้น'}</h2>
        {selected ? (
          <Inspector selected={selected} />
        ) : (
          <div className="form">
            <label>
              กว้างที่ดิน (ม.)
              <input defaultValue={project.site.width} key={`w-${project.site.width}`} type="number" min="8" step="1" onBlur={(event) => studio.update((draft) => { draft.site.width = Math.max(8, Number(event.target.value) || 8) })} />
            </label>
            <label>
              ลึกที่ดิน (ม.)
              <input defaultValue={project.site.depth} key={`d-${project.site.depth}`} type="number" min="8" step="1" onBlur={(event) => studio.update((draft) => { draft.site.depth = Math.max(8, Number(event.target.value) || 8) })} />
            </label>
            <label className="check">
              <input type="checkbox" checked={project.autoStructure !== false} onChange={(event) => studio.update((draft) => { draft.autoStructure = event.target.checked })} />
              ลากห้องแล้วใส่เสาและคานให้
            </label>
            <label>
              วัสดุโครงสร้าง
              <select value={project.structureMaterial} onChange={(event) => studio.update((draft) => { draft.structureMaterial = event.target.value })}>
                <option value="concrete">คอนกรีตเสริมเหล็ก</option>
                <option value="steel">เหล็กรูปพรรณ</option>
              </select>
            </label>
            <label>
              ทาสีกี่ด้าน
              <select value={project.paintSides} onChange={(event) => studio.update((draft) => { draft.paintSides = Number(event.target.value) })}>
                <option value={2}>2 ด้าน</option>
                <option value={1}>1 ด้าน</option>
              </select>
            </label>
            <label>
              เผื่อวัสดุ {(Math.round(project.waste * 100))}%
              <input type="range" min="0" max="15" value={Math.round(project.waste * 100)} onChange={(event) => studio.update((draft) => { draft.waste = Number(event.target.value) / 100 })} />
            </label>
            <div className="level-editor">
              {project.levels.map((level) => (
                <div key={level.id}>
                  <button type="button" className={level.id === project.activeLevelId ? 'on' : ''} onClick={() => studio.setActiveLevel(level.id)}>{level.name}</button>
                  <input
                    aria-label={`ความสูง${level.name}`}
                    defaultValue={level.height}
                    key={`${level.id}-${level.height}`}
                    type="number"
                    min="2.4"
                    step="0.1"
                    onBlur={(event) => studio.setLevelHeight(level.id, Number(event.target.value))}
                  />
                  <span>ม.</span>
                  {project.levels.length > 1 && (
                    <button type="button" onClick={() => studio.removeLevel(level.id)}>ลบ</button>
                  )}
                </div>
              ))}
              <button type="button" className="primary" onClick={() => studio.addLevel()}>เพิ่มชั้นบน</button>
            </div>
            {labels.length > 0 && (
              <div className="label-list">
                {labels.map((label) => (
                  <button key={label.id} type="button" onClick={() => studio.setSelection(label.id)}>{label.text}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="boq">
        <header>
          <h2>BOQ สดจากโมเดล</h2>
          <p>ราคาตั้งต้น แก้ได้ · รวมเผื่อ {Math.round(project.waste * 100)}% สำหรับ ม. ตร.ม. ลบ.ม.</p>
        </header>
        {boq.trades.length === 0 && <p className="empty">ยังไม่มีปริมาณ ลากห้องลงบนที่ดินเพื่อเริ่ม</p>}
        {boq.trades.map((trade) => (
          <div key={trade.name} className="trade">
            <h3>{trade.name}</h3>
            <table>
              <tbody>
                {trade.lines.map((item) => (
                  <tr key={`${trade.name}-${item.name}`}>
                    <td>
                      {item.name}
                      <small>{formatQty(item.qty)} {item.unit}</small>
                    </td>
                    <td>
                      <input
                        aria-label={`ราคา ${item.name}`}
                        defaultValue={Math.round(item.rate)}
                        key={`${item.rateKey}-${item.rate}`}
                        type="number"
                        min="0"
                        onBlur={(event) => studio.update((draft) => {
                          draft.rates[item.rateKey] = Math.max(0, Number(event.target.value) || 0)
                        })}
                      />
                    </td>
                    <td>{formatBaht(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <dl className="totals">
          <div><dt>งานก่อสร้าง</dt><dd>{formatBaht(boq.constructionTotal)}</dd></div>
          <div><dt>ตกแต่ง แยกไว้</dt><dd>{formatBaht(boq.furnishTotal)}</dd></div>
        </dl>
        <p className="note">ปริมาณมาจากก้อนในโมเดล ความยาวคานหักช่วงที่ชนเสาแล้ว งานฐานรากและพื้นโครงสร้างแยกจากผิวพื้น ราคานี้เป็นค่าตั้งต้น ไม่ใช่ราคากลาง พ.ศ. 2569 และยังไม่รวมกำไร ภาษี งานขุดดิน และงานประปา</p>
      </section>
    </aside>
  )
}

function Inspector({ selected }) {
  const studio = useStudio()
  const patch = (data) => studio.patch(selected.id, data)

  return (
    <div className="form">
      {selected.type === 'label' && (
        <label>
          ชื่อพื้นที่
          <input value={selected.text} onChange={(event) => patch({ text: event.target.value })} />
        </label>
      )}
      {selected.type === 'wall' && (
        <>
          <NumberField label="สูง (ม.)" value={selected.height} onCommit={(height) => patch({ height })} />
          <NumberField label="หนา (ม.)" value={selected.thickness} step="0.01" onCommit={(thickness) => patch({ thickness })} />
          <FinishField value={selected.finish} onChange={(finish) => patch({ finish })} />
        </>
      )}
      {selected.type === 'slab' && (
        <>
          <NumberField label="หนา (ม.)" value={selected.thickness} step="0.01" onCommit={(thickness) => patch({ thickness })} />
          <FinishField value={selected.finish} onChange={(finish) => patch({ finish })} />
        </>
      )}
      {(selected.type === 'column' || selected.type === 'beam') && (
        <>
          <label>
            วัสดุ
            <select value={selected.material} onChange={(event) => patch({ material: event.target.value })}>
              <option value="concrete">คอนกรีต</option>
              <option value="steel">เหล็ก</option>
            </select>
          </label>
          <NumberField label="กว้าง (ม.)" value={selected.w} step="0.01" onCommit={(w) => patch({ w })} />
          {selected.type === 'column' ? (
            <NumberField label="ลึก (ม.)" value={selected.d} step="0.01" onCommit={(d) => patch({ d })} />
          ) : (
            <NumberField label="สูงคาน (ม.)" value={selected.h} step="0.01" onCommit={(h) => patch({ h })} />
          )}
        </>
      )}
      {selected.type === 'engineering' && (
        <>
          <p className="meta">{ENGINEERING[selected.kind]?.name || 'งานวิศวกรรม'}</p>
          {selected.x1 == null ? (
            <>
              <p className="meta">ลากชิ้นงานหรือจุดกลางสีครีมเพื่อย้าย ลากขอบส้มปรับกว้าง ลากขอบเขียวปรับยาว</p>
              <NumberField label="กว้าง (ม.)" value={selected.w} onCommit={(w) => patch({ w: snapDim(clampDim('w', w, ENGINEERING_LIMIT)) })} />
              <NumberField label="ยาว (ม.)" value={selected.d} onCommit={(d) => patch({ d: snapDim(clampDim('d', d, ENGINEERING_LIMIT)) })} />
              <NumberField
                label={selected.kind === 'pile' ? 'ความยาวเสาเข็ม (ม.)' : 'หนาหรือสูง (ม.)'}
                value={selected.h}
                onCommit={(h) => patch({ h: snapDim(clampDim('h', h, ENGINEERING_LIMIT)) })}
              />
            </>
          ) : (
            <>
              <p className="meta">ยาว {Math.hypot(selected.x2 - selected.x1, selected.z2 - selected.z1).toFixed(2)} ม.</p>
              <NumberField label="กว้าง (ม.)" value={selected.w} onCommit={(w) => patch({ w: snapDim(clampDim('w', w, ENGINEERING_LIMIT)) })} />
              <NumberField label="สูงหรือลึก (ม.)" value={selected.h} onCommit={(h) => patch({ h: snapDim(clampDim('h', h, ENGINEERING_LIMIT)) })} />
            </>
          )}
        </>
      )}
      {selected.type === 'furniture' && (
        <>
          <p className="meta">ลากตัวชิ้นงานหรือจุดกลางสีครีมเพื่อย้าย ลากขอบส้มปรับกว้าง ลากขอบเขียวปรับยาว</p>
          <NumberField label="กว้าง (ม.)" value={selected.w} onCommit={(w) => patch({ w: snapDim(clampDim('w', w)) })} />
          <NumberField label="ยาว (ม.)" value={selected.d} onCommit={(d) => patch({ d: snapDim(clampDim('d', d)) })} />
          <NumberField label="สูง (ม.)" value={selected.h} onCommit={(h) => patch({ h: snapDim(clampDim('h', h)) })} />
        </>
      )}
      {selected.type === 'roof' && (
        <>
          <label>
            แบบ
            <select value={selected.type === 'roof' ? studio.project.roof.type : selected.type} onChange={(event) => patch({ type: event.target.value })}>
              <option value="gable">จั่ว</option>
              <option value="flat">แบน</option>
              <option value="none">ไม่มี</option>
            </select>
          </label>
          <NumberField label="องศา" value={studio.project.roof.pitch} onCommit={(pitch) => patch({ pitch })} />
          <NumberField label="ชายคา (ม.)" value={studio.project.roof.overhang} step="0.1" onCommit={(overhang) => patch({ overhang })} />
          <FinishField value={studio.project.roof.material} onChange={(material) => patch({ material })} />
        </>
      )}
      {(selected.type === 'door' || selected.type === 'window') && (
        <p className="meta">ลากบนโมเดลเพื่อเลื่อนไปตามผนัง กว้าง {Number(selected.width).toFixed(2)} ม.</p>
      )}
      {(selected.type === 'stair' || selected.type === 'device' || selected.type === 'light' || selected.type === 'conduit' || selected.type === 'junction') && (
        <p className="meta">{selected.type === 'device' || selected.type === 'light' || selected.type === 'junction' ? 'ลากบนโมเดลเพื่อย้าย' : titleOf(selected)}</p>
      )}
      <div className="row-actions">
        {canRotate(selected) && (
          <button type="button" onClick={() => patch({ rot: ((selected.rot || 0) + Math.PI / 2) % (Math.PI * 2) })}>หมุน 90°</button>
        )}
        {selected.type !== 'roof' && selected.type !== 'door' && selected.type !== 'window' && (
          <button type="button" onClick={() => studio.duplicate(selected.id)}>ทำซ้ำ</button>
        )}
        <button type="button" className="danger" onClick={() => { studio.remove(selected.id); studio.setSelection(null) }}>
          ลบ
        </button>
      </div>
    </div>
  )
}

function FinishField({ value, onChange }) {
  return (
    <label>
      วัสดุผิว
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {MATERIALS.map((item) => (
          <option key={item.id} value={item.id}>{item.group} · {item.name}</option>
        ))}
      </select>
    </label>
  )
}

function NumberField({ label, value, onCommit, step = '0.05' }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min="0.02"
        step={step}
        defaultValue={Number(value).toFixed(2)}
        key={`${label}-${value}`}
        onBlur={(event) => onCommit(Math.max(0.02, Number(event.target.value) || value))}
      />
    </label>
  )
}

function canRotate(element) {
  if (!element) return false
  if (element.type === 'furniture' || element.type === 'device' || element.type === 'column') return true
  return element.type === 'engineering' && element.x1 == null
}

function titleOf(element) {
  const names = {
    wall: 'ผนัง',
    slab: 'พื้น',
    column: 'เสา',
    beam: 'คาน',
    stair: 'บันได',
    door: 'ประตู',
    window: 'หน้าต่าง',
    furniture: 'เฟอร์นิเจอร์',
    engineering: ENGINEERING[element.kind]?.name || 'งานวิศวกรรม',
    conduit: 'แนวท่อ',
    device: element.kind === 'switch' ? 'สวิตช์' : 'เต้ารับ',
    light: 'ดวงโคม',
    junction: 'กล่องพักสาย',
    label: element.text || 'ชื่อพื้นที่',
    roof: `หลังคา ${materialById(element.material || 'roof-tile').name}`,
  }
  return names[element.type] || element.type
}

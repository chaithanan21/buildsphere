import { useEffect, useRef, useState } from 'react'
import { computeBoq, formatBaht, formatQty } from '../lib/boq.js'
import { boqCsv, downloadText, printBoq } from '../lib/exportBoq.js'
import { printPlan } from '../lib/planSheet.js'
import { useStudio } from '../state/store.jsx'

export default function TopBar() {
  const studio = useStudio()
  const fileRef = useRef(null)
  const boq = computeBoq(studio.project)
  const [name, setName] = useState(studio.project.name)
  useEffect(() => setName(studio.project.name), [studio.project.name])

  function exportCsv() {
    downloadText(`${studio.project.name}-BOQ.csv`, boqCsv(studio.project))
  }

  function exportJson() {
    downloadText(`${studio.project.name}.buildsphere.json`, JSON.stringify(studio.project, null, 2), 'application/json')
  }

  function onImport(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        studio.importProject(JSON.parse(String(reader.result)))
      } catch {
        studio.notify('อ่านไฟล์ไม่สำเร็จ')
      }
    }
    reader.readAsText(file)
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" aria-hidden="true" />
        <div>
          <strong>BuildSphere</strong>
          <em>จากที่ดินว่างถึงอาคารพร้อมปริมาณ</em>
        </div>
      </div>
      <input
        className="project-name"
        aria-label="ชื่อโครงการ"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          if (name !== studio.project.name) studio.update((draft) => { draft.name = name })
        }}
      />
      <div className="template-row">
        <button type="button" onClick={() => studio.loadTemplate('empty')}>ที่ดินว่าง</button>
        <button type="button" onClick={() => studio.loadTemplate('house')}>บ้าน 2 ชั้น</button>
        <button type="button" onClick={() => studio.loadTemplate('factory')}>โรงงาน</button>
      </div>
      <p className="live-qty">
        พื้น {formatQty(boq.floorArea)} ตร.ม.
        <span>คอนกรีต {formatQty(boq.headline.concrete)} ลบ.ม.</span>
        <span>{formatBaht(boq.constructionTotal)}</span>
      </p>
      <div className="top-actions">
        <div className="action-group">
          <button type="button" onClick={studio.undo} disabled={!studio.canUndo}>ย้อน</button>
          <button type="button" onClick={studio.redo} disabled={!studio.canRedo}>ทำซ้ำ</button>
        </div>
        <div className="action-group">
          <button type="button" onClick={exportCsv}>CSV</button>
          <button type="button" onClick={() => printBoq(studio.project) || studio.notify('เปิดหน้าพิมพ์ไม่สำเร็จ ลองอีกครั้ง')}>
            พิมพ์ BOQ
          </button>
          <button type="button" onClick={() => printPlan(studio.project) || studio.notify('เปิดหน้าพิมพ์ไม่สำเร็จ ลองอีกครั้ง')}>
            พิมพ์แปลน
          </button>
          <button type="button" onClick={exportJson}>บันทึกไฟล์</button>
          <button type="button" onClick={() => fileRef.current?.click()}>เปิดไฟล์</button>
        </div>
        <button type="button" className="quiet" onClick={() => studio.setAbout(true)}>แนวคิด</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      </div>
    </header>
  )
}

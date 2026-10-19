import { PHASES, TOOLS } from '../lib/catalog.js'
import { buildingBounds } from '../lib/geometry.js'
import { useStudio } from '../state/store.jsx'

export default function ToolRail() {
  const studio = useStudio()

  function dragTool(event, tool) {
    const payload = JSON.stringify({ drag: 'tool', tool: tool.id, kind: tool.kind || null })
    event.dataTransfer.setData('application/json', payload)
    event.dataTransfer.setData('text/plain', payload)
    event.dataTransfer.effectAllowed = 'copy'
  }

  function arm(tool) {
    studio.setTool({ id: tool.id, kind: tool.kind || null })
    if (tool.id !== 'select') studio.setStyle('full')
  }

  function setRoof(type) {
    if (!buildingBounds(studio.project.elements.filter((item) => item.type === 'wall'))) {
      studio.notify('วางผนังหรือห้องก่อน แล้วค่อยมุงหลังคา')
      return
    }
    studio.update((draft) => {
      draft.roof.type = type
      if (!draft.roof.pitch) draft.roof.pitch = type === 'flat' ? 6 : 32
    })
    studio.setPresentation('exterior')
    studio.notify(type === 'flat' ? 'มุงหลังคาแบนแล้ว สลับภายนอกหรือภายในได้' : 'มุงหลังคาจั่วแล้ว สลับภายนอกหรือภายในได้')
  }

  const selectTool = TOOLS.find((tool) => tool.id === 'select')

  return (
    <aside className="rail">
      <p className="rail-kicker">ลากเครื่องมือลงบนที่ดิน</p>
      <div className="tool-grid">
        <button
          type="button"
          className={studio.tool.id === 'select' ? 'on' : ''}
          onClick={() => arm(selectTool)}
        >
          <span>เลือก</span>
          <kbd>V</kbd>
        </button>
      </div>
      {PHASES.map((phase) => (
        <section key={phase.id}>
          <h2>{phase.name}</h2>
          <div className="tool-grid">
            {TOOLS.filter((tool) => tool.phase === phase.id).map((tool) => {
              const active = studio.tool.id === tool.id && (tool.kind || null) === (studio.tool.kind || null)
              return (
                <button
                  key={`${tool.id}-${tool.kind || ''}`}
                  type="button"
                  draggable
                  className={`${active ? 'on' : ''} ${tool.primary ? 'primary' : ''}`}
                  onClick={() => arm(tool)}
                  onDragStart={(event) => dragTool(event, tool)}
                >
                  <span>{tool.name}</span>
                  {tool.shortcut && <kbd>{tool.shortcut}</kbd>}
                </button>
              )
            })}
          </div>
          {phase.id === 'shell' && (
            <div className="roof-row">
              <button type="button" onClick={() => setRoof('gable')}>หลังคาจั่ว</button>
              <button type="button" onClick={() => setRoof('flat')}>หลังคาแบน</button>
              <button type="button" onClick={() => studio.update((draft) => { draft.roof.type = 'none' })}>เอาหลังคาออก</button>
            </div>
          )}
        </section>
      ))}
    </aside>
  )
}

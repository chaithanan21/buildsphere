import { MATERIALS } from '../lib/catalog.js'
import { useStudio } from '../state/store.jsx'

export default function MaterialTray() {
  const studio = useStudio()
  const groups = ['พื้น', 'ผนัง', 'หลังคา']

  function dragMaterial(event, id) {
    const payload = JSON.stringify({ drag: 'material', id })
    event.dataTransfer.setData('application/json', payload)
    event.dataTransfer.setData('text/plain', payload)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="tray">
      <p>ลากวัสดุลงบนพื้น ผนัง หรือหลังคา</p>
      {groups.map((group) => (
        <div key={group} className="swatches">
          <span>{group}</span>
          {MATERIALS.filter((item) => item.group === group).map((item) => (
            <button
              key={item.id}
              type="button"
              draggable
              className={studio.tool.id === 'material' && studio.tool.kind === item.id ? 'on' : ''}
              onClick={() => studio.setTool({ id: 'material', kind: item.id })}
              onDragStart={(event) => dragMaterial(event, item.id)}
              title={item.name}
            >
              <i style={{ background: item.color, opacity: item.opacity }} />
              {item.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

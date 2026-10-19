import { useEffect } from 'react'
import Viewport from './scene/Viewport.jsx'
import { useStudio } from './state/store.jsx'
import About from './ui/About.jsx'
import MaterialTray from './ui/MaterialTray.jsx'
import SidePanel from './ui/SidePanel.jsx'
import ToolRail from './ui/ToolRail.jsx'
import TopBar from './ui/TopBar.jsx'
import Welcome from './ui/Welcome.jsx'
import { TOOLS } from './lib/catalog.js'

export default function App() {
  const studio = useStudio()

  useEffect(() => {
    function onKey(event) {
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.code === 'Escape') {
        if (studio.presentation === 'walk' || studio.presentation === 'play') studio.setPresentation('orbit')
        studio.stage.cancelDraft?.()
        studio.setTool({ id: 'select', kind: null })
        studio.setAbout(false)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
        event.preventDefault()
        if (event.shiftKey) studio.redo()
        else studio.undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyY') {
        event.preventDefault()
        studio.redo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC') {
        event.preventDefault()
        studio.copy()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyV') {
        event.preventDefault()
        studio.paste()
        return
      }
      if (studio.presentation === 'walk' || studio.presentation === 'play') return
      if (event.code === 'Enter') studio.stage.finishConduit?.()
      if ((event.code === 'Delete' || event.code === 'Backspace') && studio.selection) {
        studio.remove(studio.selection)
        studio.setSelection(null)
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const shortcut = { KeyV: 'select', KeyB: 'room', KeyW: 'wall', KeyE: 'conduit' }[event.code]
      if (shortcut) {
        const tool = TOOLS.find((item) => item.id === shortcut)
        studio.setTool({ id: shortcut, kind: tool?.kind || null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [studio])

  function onDrop(event) {
    event.preventDefault()
    const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain')
    if (!raw) return
    try {
      studio.stage.dropAt?.(event.clientX, event.clientY, JSON.parse(raw))
    } catch {
      studio.notify('วางเครื่องมือไม่สำเร็จ')
    }
  }

  const hint = TOOLS.find((tool) => tool.id === studio.tool.id && (tool.kind || null) === (studio.tool.kind || null))
  const selectedPiece = studio.project.elements.find((item) => item.id === studio.selection)
  const status = selectedPiece?.type === 'furniture' || (selectedPiece?.type === 'engineering' && selectedPiece.x1 == null)
    ? 'ลากตัวชิ้นงานหรือจุดกลางเพื่อย้าย · ขอบส้มปรับกว้าง · ขอบเขียวปรับยาว'
    : hint?.hint || 'เลือกชิ้นงานบนโมเดล'

  return (
    <div className={`app ${studio.tool.id === 'select' ? '' : 'drawing'}`}>
      <TopBar />
      {studio.banner && <p className="banner">{studio.banner}</p>}
      <div className="workspace">
        <ToolRail />
        <div
          className="stage"
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDrop={onDrop}
        >
          <Viewport />
          <MaterialTray />
          {studio.welcome && <Welcome />}
        </div>
        <SidePanel />
      </div>
      <footer className="statusbar">
        <span>{status}</span>
        <span>บันทึกในเบราว์เซอร์นี้ให้อัตโนมัติ</span>
      </footer>
      <About />
    </div>
  )
}

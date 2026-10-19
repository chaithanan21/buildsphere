import { flushSync } from 'react-dom'
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { emptyProject, isProject, normalizeProject, projectFromTemplate } from '../data/templates.js'
import { addElements, addLevel, applyFinish, duplicateElement, pasteElement, patchElement, removeElements, removeLevel, setLevelHeight } from '../lib/mutate.js'

const STORAGE_KEY = 'buildsphere.studio.v1'
const StudioContext = createContext(null)

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data?.v === 1 && isProject(data.project)) return { project: normalizeProject(data.project), fresh: false }
    }
  } catch {
    /* ไฟล์ในเครื่องอ่านไม่ได้ ให้เริ่มที่ดินว่าง */
  }
  return { project: emptyProject(), fresh: true }
}

function historyReducer(state, action) {
  if (action.type === 'undo') return { ...state, index: Math.max(0, state.index - 1) }
  if (action.type === 'redo') return { ...state, index: Math.min(state.history.length - 1, state.index + 1) }
  const history = state.history.slice(0, state.index + 1)
  if (action.type === 'set') history.push(action.project)
  if (action.type === 'recipe') {
    const draft = structuredClone(state.history[state.index])
    if (action.recipe(draft) === false) return state
    history.push(draft)
  }
  if (history.length > 50) history.shift()
  return { history, index: history.length - 1 }
}

export function StudioProvider({ children }) {
  const initial = useRef(loadInitial())
  const [history, dispatch] = useReducer(historyReducer, {
    history: [initial.current.project],
    index: 0,
  })
  const project = history.history[history.index]
  const [tool, setTool] = useState({ id: 'select', kind: null })
  const [selection, setSelection] = useState(null)
  const [presentation, setPresentation] = useState('orbit')
  const [spin, setSpin] = useState(false)
  const [style, setStyle] = useState('full')
  const [showAllLevels, setShowAllLevels] = useState(true)
  const [frameToken, setFrameToken] = useState(0)
  const [welcome, setWelcome] = useState(initial.current.fresh)
  const [about, setAbout] = useState(false)
  const [recordWalk, setRecordWalk] = useState(false)
  const [banner, setBanner] = useState('')
  const bannerTimer = useRef(0)
  const stage = useRef({})
  const clipboard = useRef(null)

  const notify = useCallback((text) => {
    setBanner(text)
    window.clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setBanner(''), 4600)
  }, [])

  const commit = useCallback((recipe) => dispatch({ type: 'recipe', recipe }), [])
  const update = commit

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, project }))
      } catch {
        /* ที่เก็บของเบราว์เซอร์เต็ม */
      }
    }, 200)
    return () => window.clearTimeout(handle)
  }, [project])

  const loadTemplate = useCallback((id) => {
    const next = projectFromTemplate(id)
    dispatch({ type: 'set', project: next })
    setSelection(null)
    setTool({ id: 'select', kind: null })
    setStyle('full')
    setSpin(false)
    setShowAllLevels(true)
    setPresentation(id === 'empty' ? 'orbit' : 'exterior')
    setFrameToken((token) => token + 1)
    setWelcome(false)
  }, [])

  const importProject = useCallback(
    (data) => {
      if (!isProject(data)) {
        notify('ไฟล์นี้ไม่ใช่งานของ BuildSphere')
        return
      }
      dispatch({ type: 'set', project: normalizeProject(data) })
      setSelection(null)
      setFrameToken((token) => token + 1)
      setPresentation('exterior')
      setWelcome(false)
      notify('นำเข้าโมเดลแล้ว')
    },
    [notify],
  )

  const api = useMemo(
    () => ({
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      add: (elements) => commit((draft) => (addElements(draft, elements) ? undefined : false)),
      patch: (id, data) => commit((draft) => patchElement(draft, id, data)),
      remove: (ids) => commit((draft) => removeElements(draft, [].concat(ids))),
      duplicate: (id) => {
        let nextId = null
        flushSync(() => {
          commit((draft) => {
            nextId = duplicateElement(draft, id)
            if (!nextId) return false
          })
        })
        if (nextId) setSelection(nextId)
      },
      copy: () => {
        if (selection === 'roof') {
          notify('คัดลอกหลังคาทั้งผืนไม่ได้ เลือกชิ้นงานในโมเดลก่อน')
          return
        }
        const element = project.elements.find((item) => item.id === selection)
        if (!element) {
          notify('เลือกชิ้นงานก่อน แล้วกด Ctrl+C')
          return
        }
        if (element.type === 'door' || element.type === 'window') {
          notify('คัดลอกช่องเปิดแยกจากผนังไม่ได้')
          return
        }
        clipboard.current = { element: structuredClone(element), pastes: 0 }
        notify('คัดลอกแล้ว กด Ctrl+V เพื่อวาง')
      },
      paste: () => {
        const clip = clipboard.current
        if (!clip?.element) {
          notify('ยังไม่มีชิ้นงานที่คัดลอก')
          return
        }
        const step = (Number(clip.pastes) || 0) + 1
        clip.pastes = step
        const offset = step * 0.5
        let nextId = null
        flushSync(() => {
          commit((draft) => {
            nextId = pasteElement(draft, clip.element, offset)
            if (!nextId) return false
          })
        })
        if (!nextId) {
          clip.pastes -= 1
          notify('วางทับตำแหน่งเดิมไม่ได้')
          return
        }
        setSelection(nextId)
        setTool({ id: 'select', kind: null })
        notify('วางแล้ว')
      },
      applyFinish: (target, materialId) => commit((draft) => applyFinish(draft, target, materialId)),
      addLevel: () => commit((draft) => addLevel(draft)),
      removeLevel: (id) => commit((draft) => removeLevel(draft, id)),
      setLevelHeight: (id, height) => commit((draft) => setLevelHeight(draft, id, height)),
      setActiveLevel: (id) => commit((draft) => {
        draft.activeLevelId = id
      }),
    }),
    [commit, notify, project, selection],
  )

  const value = {
    project,
    canUndo: history.index > 0,
    canRedo: history.index < history.history.length - 1,
    tool,
    setTool,
    selection,
    setSelection,
    presentation,
    setPresentation,
    spin,
    setSpin,
    style,
    setStyle,
    showAllLevels,
    setShowAllLevels,
    frameToken,
    welcome,
    setWelcome,
    about,
    setAbout,
    recordWalk,
    setRecordWalk,
    banner,
    stage,
    notify,
    update,
    loadTemplate,
    importProject,
    ...api,
  }

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const context = useContext(StudioContext)
  if (!context) throw new Error('useStudio ต้องอยู่ใต้ StudioProvider')
  return context
}

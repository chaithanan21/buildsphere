export function printHtml(html) {
  const frame = document.createElement('iframe')
  frame.setAttribute('title', 'หน้าพิมพ์')
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff;z-index:80'
  document.body.appendChild(frame)
  const doc = frame.contentDocument || frame.contentWindow?.document
  if (!doc) {
    frame.remove()
    return false
  }
  doc.open()
  doc.write(html)
  doc.close()
  const win = frame.contentWindow
  const remove = () => frame.remove()
  win.addEventListener('afterprint', () => window.setTimeout(remove, 300))
  window.setTimeout(remove, 120000)
  try {
    win.focus()
    win.print()
  } catch {
    remove()
    return false
  }
  return true
}

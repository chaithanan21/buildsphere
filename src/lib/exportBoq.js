import { computeBoq, formatBaht, formatQty } from './boq.js'
import { printHtml } from './printFrame.js'

export function boqCsv(project) {
  const boq = computeBoq(project)
  const rows = [['หมวด', 'รายการ', 'หน่วย', 'ปริมาณสุทธิ', 'ปริมาณรวมเผื่อ', 'ราคาต่อหน่วย', 'เป็นเงิน']]
  for (const trade of boq.trades) {
    for (const item of trade.lines) {
      rows.push([
        trade.name,
        item.name,
        item.unit,
        round(item.net),
        round(item.qty),
        String(Math.round(item.rate)),
        String(Math.round(item.amount)),
      ])
    }
  }
  rows.push([])
  rows.push(['', 'รวมค่างานก่อสร้าง', '', '', '', '', String(Math.round(boq.constructionTotal))])
  rows.push(['', 'รวมงานตกแต่ง (แยก)', '', '', '', '', String(Math.round(boq.furnishTotal))])
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([mime.includes('csv') ? `\uFEFF${text}` : text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function boqHtml(project) {
  const boq = computeBoq(project)
  const today = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })
  const body = boq.trades
    .map((trade) => {
      const rows = trade.lines
        .map(
          (item) => `<tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.unit}</td>
            <td class="num">${formatQty(item.net)}</td>
            <td class="num">${formatQty(item.qty)}</td>
            <td class="num">${formatBaht(item.rate)}</td>
            <td class="num">${formatBaht(item.amount)}</td>
          </tr>`,
        )
        .join('')
      return `<h2>${escapeHtml(trade.name)}</h2>
        <table>
          <thead><tr><th>รายการ</th><th>หน่วย</th><th>สุทธิ</th><th>รวมเผื่อ</th><th>ราคาตั้งต้น</th><th>เป็นเงิน</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="5">รวมหมวด</td><td class="num">${formatBaht(trade.total)}</td></tr></tfoot>
        </table>`
    })
    .join('')
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>BOQ ${escapeHtml(project.name)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body { font-family: "Leelawadee UI", Sarabun, "Segoe UI", sans-serif; color: #1d1a16; margin: 24px; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin: 22px 0 8px; }
      p { color: #5c564e; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border-bottom: 1px solid #e4d9cc; padding: 6px 8px; text-align: left; }
      th { background: #f6f1e8; }
      .num { text-align: right; font-variant-numeric: tabular-nums; }
      .total { margin-top: 18px; font-size: 16px; }
    </style></head><body>
    <h1>บัญชีแสดงปริมาณและราคาตั้งต้น</h1>
    <p>${escapeHtml(project.name)} · ${today}<br>
    พื้นที่ใช้สอยจากแผ่นพื้น ${formatQty(boq.floorArea)} ตร.ม. · เผื่อวัสดุ ${(boq.waste * 100).toFixed(0)}%<br>
    ราคาต่อหน่วยเป็นค่าตั้งต้นสำหรับคัดปริมาณระหว่างออกแบบ ไม่ใช่ราคากลางตามหลักเกณฑ์ พ.ศ. 2569 งานฐานรากและพื้นโครงสร้างมาจากก้อนในโมเดล และยังไม่หักภาษีหรือกำไรผู้รับเหมา</p>
    ${body}
    <p class="total">รวมค่างานก่อสร้าง ${formatBaht(boq.constructionTotal)}</p>
    <p>รวมงานตกแต่ง ซึ่งแยกจากค่างานก่อสร้าง ${formatBaht(boq.furnishTotal)}</p>
    </body></html>`
  return html
}

export function printBoq(project) {
  return printHtml(boqHtml(project))
}

function csvCell(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

function round(value) {
  return value.toFixed(2)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

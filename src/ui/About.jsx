import { useStudio } from '../state/store.jsx'

export default function About() {
  const studio = useStudio()
  if (!studio.about) return null
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <div className="modal-card">
        <header>
          <h2 id="about-title">ทำไมถึงออกแบบอย่างนี้</h2>
          <button type="button" onClick={() => studio.setAbout(false)}>ปิด</button>
        </header>
        <p>
          เครื่องมือในตลาดแยกความเร็วกับปริมาณออกจากกัน SketchUp ปั้นรูปเร็วแต่ไม่รู้ว่าก้อนไหนเป็นผนังหรือเสา
          Revit กับ Archicad รู้และถอดปริมาณได้ แต่เรียนรู้หนักและเอกสารกับโมเดลมักคนละจังหวะ
          SpacePlanner, Planner 5D และ Homestyler ทำแปลนถึง 3D ได้เร็ว แต่วงจรหยุดก่อนโครงสร้างและ BOQ
        </p>
        <table>
          <thead>
            <tr>
              <th>งานที่กินเวลา</th>
              <th>BuildSphere</th>
              <th>เครื่องมือทั่วไป</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ได้ห้องพร้อมเสาและคาน</td>
              <td>ลากครั้งเดียว</td>
              <td>SketchUp ไม่รู้ชนิดชิ้นงาน ส่วน BIM ต้องสั่งทีละแฟมิลี่</td>
            </tr>
            <tr>
              <td>ปริมาณระหว่างออกแบบ</td>
              <td>BOQ ขยับทันทีจากโมเดลชุดเดียวกัน</td>
              <td>มักวัดจากแบบ PDF ทีหลัง แล้วค่อยreconcile กับโมเดล</td>
            </tr>
            <tr>
              <td>ท่อร้อยสาย</td>
              <td>ลากแนวสีเหลืองแล้วได้ความยาวและข้อต่อ</td>
              <td>วางคอมโพเนนต์เอง หรือแยกชุด MEP</td>
            </tr>
            <tr>
              <td>ภายนอก ภายใน เดินชม</td>
              <td>สลับในหน้านี้ และอัดวิดีโอเดินในได้</td>
              <td>เรนเดอร์หรือวอล์กทรูมักเป็นอีกโปรแกรม</td>
            </tr>
          </tbody>
        </table>
        <p>
          สตูดิโอนี้ตั้งใจปิดช่วงแรกของงาน ตั้งแต่วันที่ที่ดินยังว่างจนถึงอาคารที่คุยกับเจ้าของงานและถอดปริมาณตั้งต้นได้
          มันยังไม่แทนแบบขออนุญาต การวิเคราะห์โครงสร้าง หรือราคากลางตามหลักเกณฑ์ พ.ศ. 2569
        </p>
        <p className="refs">
          อ้างอิงที่ใช้วางขอบเขต:{' '}
          <a href="https://spaceplanner.co/editor" target="_blank" rel="noreferrer">SpacePlanner</a>,{' '}
          <a href="https://www.sketchup.com/" target="_blank" rel="noreferrer">SketchUp</a>,{' '}
          <a href="https://www.autodesk.com/products/revit/overview" target="_blank" rel="noreferrer">Revit</a>,{' '}
          <a href="https://graphisoft.com/solutions/archicad" target="_blank" rel="noreferrer">Archicad</a>,{' '}
          <a href="https://cedreo.com/" target="_blank" rel="noreferrer">Cedreo</a>,{' '}
          <a href="https://rakaklang.yotathai.com/boq/" target="_blank" rel="noreferrer">บัญชีราคากลางงานอาคาร</a>
        </p>
      </div>
    </div>
  )
}

import { useStudio } from '../state/store.jsx'

const CARDS = [
  {
    id: 'empty',
    kicker: 'วันที่ 1',
    title: 'ที่ดินว่าง',
    text: 'เริ่มจากแปลงเปล่า ลากห้อง แล้วค่อยยกเป็นอาคารทั้งหลัง',
  },
  {
    id: 'house',
    kicker: 'เทมเพลต',
    title: 'บ้าน 2 ชั้น',
    text: 'โครงสร้าง ผนัง บันได เฟอร์นิเจอร์ ระบบไฟ และหลังคาจั่ว',
  },
  {
    id: 'factory',
    kicker: 'เทมเพลต',
    title: 'โรงงานผลิต',
    text: 'โครงเหล็ก โซนผลิต สำนักงาน คลัง และห้องตรวจคุณภาพ',
  },
]

export default function Welcome() {
  const studio = useStudio()
  return (
    <div className="welcome">
      <div>
        <p className="rail-kicker">เริ่มงานออกแบบ</p>
        <h2>วันนี้จะเริ่มจากที่ว่าง หรือเปิดอาคารที่ทำไว้แล้ว</h2>
        <div className="welcome-grid">
          {CARDS.map((card) => (
            <button key={card.id} type="button" onClick={() => studio.loadTemplate(card.id)}>
              <small>{card.kicker}</small>
              <strong>{card.title}</strong>
              <span>{card.text}</span>
            </button>
          ))}
        </div>
        <button type="button" className="text-btn" onClick={() => studio.setWelcome(false)}>ปิด แล้วดูที่ดินเปล่า</button>
      </div>
    </div>
  )
}

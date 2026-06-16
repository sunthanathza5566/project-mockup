export default function AboutSection() {
  const mottos = [
    { icon: '☁️', num: '01', text: 'เพราะเราเชื่อว่าการศึกษาที่ดี เริ่มจาก<strong>ใจ</strong>ที่<strong>สบาย</strong> — ครูไม่ต้องกังวลกับงานเอกสาร มีเวลาให้นักเรียนมากขึ้น' },
    { icon: '⚡', num: '02', text: 'ระบบตอบสนอง<strong>เร็ว</strong>ภายใน 1 วินาที เช็คชื่อ ดูรายงาน และรับแจ้งเตือน — ทันทีโดยไม่ต้องรอ' },
    { icon: '🤝', num: '03', text: '<strong>สะดวก</strong>สำหรับทุกคน ทั้งครู นักเรียน ผู้ปกครอง และผู้บริหาร — ไม่ต้องอบรม เริ่มใช้ได้เลยวันแรก' },
    { icon: '📱', num: '04', text: '<strong>เข้าถึง</strong>ได้ทุกที่ทุกเวลา บนมือถือ แท็บเล็ต หรือคอมพิวเตอร์ อินเทอร์เน็ตความเร็วต่ำก็ใช้ได้สบาย' },
  ];

  return (
    <section className="about-section" id="about">
      <div className="about-inner">
        <div className="section-label" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>ปรัชญาของเรา</div>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          ทำไมโรงเรียนกว่า <em>847 แห่ง</em><br />เลือก EduFlow
        </h2>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
          เราไม่ได้แค่สร้างระบบ — เราเข้าใจโรงเรียน
        </p>

        <div className="motto-grid">
          {mottos.map((m, i) => (
            <div key={i} className={`motto-item animate-up${i > 0 ? ` delay-${i}` : ''}`}>
              <div className="motto-icon">{m.icon}</div>
              <div className="motto-num">{m.num}</div>
              <p className="motto-text" dangerouslySetInnerHTML={{ __html: m.text }} />
            </div>
          ))}
          <div className="motto-item motto-item-wide animate-up delay-4">
            <div className="motto-icon">💚</div>
            <p className="motto-text">
              EduFlow สร้างด้วยความเข้า<strong>ใจ</strong> เพื่อให้ทุกโรงเรียนไทยก้าวไปข้างหน้าอย่างมั่น<strong>ใจ</strong> ปราศจากข้อกังวล
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

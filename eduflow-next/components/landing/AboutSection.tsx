export default function AboutSection() {
  const items = [
    { icon: '🔗', num: '01', text: 'หลักฐานชิ้นเดียว <strong>ผูกได้หลายข้อ</strong> โดยไม่ต้องคัดลอก รหัส <code>E-x.x-nn</code> ไม่ซ้ำและอ้างอิงในเนื้อหาได้ทันที' },
    { icon: '🧭', num: '02', text: '<strong>ตรวจช่องว่าง</strong>ตามกฎ R1–R10 แสดง heatmap 53 ข้อและ % ความพร้อม รู้ว่าต้องเติมอะไรก่อน' },
    { icon: '✅', num: '03', text: '<strong>เวิร์กโฟลว์อนุมัติ</strong>ตามบทบาท ล็อกฉบับเมื่ออนุมัติสุดท้าย พร้อมลายนิ้วมือเอกสาร (hash)' },
    { icon: '🛡️', num: '04', text: 'AI <strong>ปกปิดข้อมูลส่วนบุคคล</strong>ก่อนประมวลผล ตรวจการอ้างอิงและตัวเลข และต้องให้คนกด “ยอมรับ” ก่อนเข้าเอกสาร' },
  ];

  return (
    <section className="about-section" id="about">
      <div className="about-inner">
        <div className="section-label" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>จุดเด่น</div>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          เขียน SAR <em>ได้เร็ว</em> และตรวจสอบย้อนกลับได้
        </h2>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
          ออกแบบจากงานจริงของหลักสูตร — ไม่ให้คะแนนแทนกรรมการ ไม่แต่งหลักฐานขึ้นเอง
        </p>

        <div className="motto-grid">
          {items.map((m, i) => (
            <div key={i} className={`motto-item animate-up${i > 0 ? ` delay-${i}` : ''}`}>
              <div className="motto-icon">{m.icon}</div>
              <div className="motto-num">{m.num}</div>
              <p className="motto-text" dangerouslySetInnerHTML={{ __html: m.text }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

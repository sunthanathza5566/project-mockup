export default function FlowSection() {
  const steps = [
    ['สร้างรอบประเมิน', 'ระบบสร้างครบ 53 ข้อให้อัตโนมัติ มอบหมายเจ้าของข้อและกำหนดส่ง'],
    ['รวบรวมหลักฐาน', 'อัปโหลด ติดธงข้อมูลส่วนบุคคล และผูกหลายข้อได้ AI ช่วยแนะนำข้อที่เกี่ยวข้อง'],
    ['เขียน SAR', 'เขียน TH/EN ตาม PDCA ให้ AI ร่าง/ตรวจ แล้วเลือกยอมรับเอง บันทึกอัตโนมัติพร้อมประวัติ'],
    ['ตรวจ อนุมัติ ล็อก', 'ประธานหลักสูตร → QA คณะ → คณบดี เปลี่ยนสถานะตามลำดับที่กำหนดเท่านั้น'],
    ['ส่งออก', 'ดาวน์โหลด SAR (.doc) ดัชนีหลักฐาน และ Appendix A (.xlsx)'],
  ];
  return (
    <section className="showcase-section" id="flow">
      <div className="about-inner">
        <div className="section-label" style={{ textAlign: 'center' }}>ขั้นตอนใช้งาน</div>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>จากหลักฐาน สู่ <em>รายงาน</em> ใน 5 ขั้น</h2>
        <div className="aq-steps">
          {steps.map(([t, d], i) => (
            <div key={i} className="aq-step">
              <div className="aq-step-no">{i + 1}</div>
              <div className="aq-step-title">{t}</div>
              <p className="aq-muted" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

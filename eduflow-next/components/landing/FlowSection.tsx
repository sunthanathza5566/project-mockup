/** ขั้นตอนใช้งาน (#flow) — เส้นเวลา 5 ขั้น แนวนอน ≥768 / แนวตั้งบนมือถือ (pages.md P1) */
const STEPS: [string, string][] = [
  ['สร้างรอบประเมิน', 'ระบบสร้างครบ 53 ข้อให้อัตโนมัติ มอบหมายเจ้าของข้อและกำหนดส่ง'],
  ['รวบรวมหลักฐาน', 'อัปโหลด ติดธงข้อมูลส่วนบุคคล และผูกหลายข้อได้ AI ช่วยแนะนำข้อที่เกี่ยวข้อง'],
  ['เขียน SAR', 'เขียน TH/EN ตาม PDCA ให้ AI ร่าง/ตรวจ แล้วเลือกยอมรับเอง บันทึกอัตโนมัติพร้อมประวัติ'],
  ['ตรวจ อนุมัติ ล็อก', 'ประธานหลักสูตร → QA คณะ → คณบดี เปลี่ยนสถานะตามลำดับที่กำหนดเท่านั้น'],
  ['ส่งออก', 'ดาวน์โหลด SAR (.docx) ดัชนีหลักฐาน และ Appendix A (.xlsx)'],
];

export default function FlowSection() {
  return (
    <section className="aq-lsection aq-lsection--alt" id="flow" aria-labelledby="flow-h">
      <div className="aq-lsection__inner">
        <h2 className="aq-lsection__title" id="flow-h">ขั้นตอนใช้งาน</h2>
        <p className="aq-lsection__lead">จากหลักฐาน สู่รายงาน ใน 5 ขั้น</p>
        <ol className="aq-flow">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="aq-flow__item">
              <span className="aq-flow__no" aria-hidden="true">{i + 1}</span>
              <h3 className="aq-feature__title">{t}</h3>
              <p className="aq-muted">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

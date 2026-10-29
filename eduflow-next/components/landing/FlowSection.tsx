/**
 * ขั้นตอนใช้งาน (#flow) — 5 ขั้น (pages.md P1 · TASK-0002 saas-spec §P1)
 * Stepper: แนวนอน ≥1024 / แนวตั้ง <1024 · วงตัวเลข outline (border-primary) · เส้นเชื่อม bg-border (ตกแต่ง aria-hidden)
 * พื้น section = bg-card + เส้นขอบบน/ล่าง (แยกจาก section ข้างเคียงโดยไม่ใช้แถบสีเข้ม)
 */
const STEPS: [string, string][] = [
  ['สร้างรอบประเมิน', 'ระบบสร้างครบ 53 ข้อให้อัตโนมัติ มอบหมายเจ้าของข้อและกำหนดส่ง'],
  ['รวบรวมหลักฐาน', 'อัปโหลด ติดธงข้อมูลส่วนบุคคล และผูกหลายข้อได้ AI ช่วยแนะนำข้อที่เกี่ยวข้อง'],
  ['เขียน SAR', 'เขียน TH/EN ตาม PDCA ให้ AI ร่าง/ตรวจ แล้วเลือกยอมรับเอง บันทึกอัตโนมัติพร้อมประวัติ'],
  ['ตรวจ อนุมัติ ล็อก', 'ประธานหลักสูตร → QA คณะ → คณบดี เปลี่ยนสถานะตามลำดับที่กำหนดเท่านั้น'],
  ['ส่งออก', 'ดาวน์โหลด SAR (.docx) ดัชนีหลักฐาน และ Appendix A (.xlsx)'],
];

export default function FlowSection() {
  return (
    <section className="scroll-mt-16 border-y bg-card px-4 py-16 text-card-foreground md:px-6 md:py-24" id="flow" aria-labelledby="flow-h">
      <div className="mx-auto max-w-screen-xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold" id="flow-h">ขั้นตอนใช้งาน</h2>
          <p className="mt-3 text-lg text-muted-foreground">จากหลักฐาน สู่รายงาน ใน 5 ขั้น</p>
        </div>
        <ol className="m-0 mt-12 grid list-none gap-6 p-0 lg:grid-cols-5 lg:gap-4">
          {STEPS.map(([t, d], i) => {
            const last = i === STEPS.length - 1;
            return (
              <li key={t} className="relative flex gap-4 lg:flex-col lg:gap-3">
                {!last && (
                  <>
                    <span className="absolute -bottom-4 left-5 top-12 w-px bg-border lg:hidden" aria-hidden="true" />
                    <span className="absolute left-12 right-0 top-5 hidden h-px bg-border lg:block" aria-hidden="true" />
                  </>
                )}
                <span
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card font-semibold tabular-nums text-primary"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 pt-1.5 lg:pt-0">
                  <h3 className="text-lg font-semibold">{t}</h3>
                  <p className="mt-1 text-muted-foreground">{d}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// รายการ action plan เดโม่ (สมมติ) — Phase B / M14
const P = 'prog-demo-cs';
export interface DemoActionItem {
  id: string; programmeId: string; requirementId: string; description: string; ownerUsername: string;
  due: string; kpi: string; status: 'open' | 'in_progress' | 'done' | 'verified';
}
export const DEMO_ACTION_ITEMS: DemoActionItem[] = [
  { id: 'act-1', programmeId: P, requirementId: '3.6', description: 'เพิ่มการประเมินผลและการทบทวนการสอนหลังจบภาคเรียน และบันทึกการปรับปรุงเป็นลายลักษณ์อักษร', ownerUsername: 'lect1', due: '2026-12-15', kpi: 'มีรายงานทบทวนการสอนครบทุกรายวิชาหลัก 100%', status: 'in_progress' },
  { id: 'act-2', programmeId: P, requirementId: '5.1', description: 'จัดทำรายงานติดตามผลแผนอัตรากำลังและเสนอแผนรองรับการเกษียณ 2 คน', ownerUsername: 'chair1', due: '2026-11-30', kpi: 'รายงานผลแผนอัตรากำลังเสนอที่ประชุมคณะภายในกำหนด', status: 'open' },
  { id: 'act-3', programmeId: P, requirementId: '1.5', description: 'เพิ่มการนำผลประเมิน PLO ไปปรับปรุงหลักสูตร (ขั้น Act) และบันทึกมติ', ownerUsername: 'chair1', due: '2027-01-31', kpi: 'ร้อยละบรรลุ PLO เฉลี่ยไม่ต่ำกว่า 85', status: 'open' },
  { id: 'act-4', programmeId: P, requirementId: '6.6', description: 'นำผลสำรวจความพึงพอใจไปปรับบริการที่ปรึกษาและติดตามผลรอบถัดไป', ownerUsername: 'staff1', due: '2026-12-31', kpi: 'ความพึงพอใจนักศึกษาเฉลี่ยไม่ต่ำกว่า 4.4 จาก 5', status: 'in_progress' },
  { id: 'act-5', programmeId: P, requirementId: '8.1', description: 'ตั้งเป้าลดอัตราออกกลางคัน และรายงานผลต่อคณะกรรมการหลักสูตรทุกภาคเรียน', ownerUsername: 'data1', due: '2026-10-31', kpi: 'อัตราออกกลางคันไม่เกินร้อยละ 8', status: 'done' },
  { id: 'act-6', programmeId: P, requirementId: '8.3', description: 'ตรวจสอบยืนยันข้อมูลผลงานตีพิมพ์ของนักศึกษาและเพิ่มการสนับสนุนการตีพิมพ์', ownerUsername: 'lect1', due: '2026-09-30', kpi: 'ผลงานตีพิมพ์นักศึกษาไม่น้อยกว่า 8 ชิ้นต่อปี', status: 'verified' },
];

'use client';

import { useRouter } from 'next/navigation';

const CRITERIA = [
  ['1', 'ผลลัพธ์การเรียนรู้ที่คาดหวัง', 5], ['2', 'โครงสร้างและเนื้อหาหลักสูตร', 7],
  ['3', 'วิธีการสอนและการเรียนรู้', 6], ['4', 'การประเมินผู้เรียน', 7],
  ['5', 'คุณภาพอาจารย์', 8], ['6', 'คุณภาพการสนับสนุนผู้เรียน', 6],
  ['7', 'สิ่งอำนวยความสะดวก', 9], ['8', 'ผลผลิตและผลลัพธ์', 5],
] as const;

export default function HeroSection() {
  const router = useRouter();
  return (
    <section className="hero" id="home">
      <div className="hero-bg-circle" />

      <div className="hero-content">
        <div className="hero-tag animate-up">AUN-QA ระดับหลักสูตร · Version 4.0</div>
        <h1 className="animate-up delay-1">
          ทำ <em>SAR</em> ให้เสร็จ<br />อย่างมีหลักฐาน
        </h1>
        <p className="hero-desc animate-up delay-2">
          ผู้ช่วยจัดทำรายงานประเมินตนเองตามเกณฑ์ AUN-QA ครบ 8 เกณฑ์ 53 ข้อ — มอบหมายงาน ผูกหลักฐาน
          ตรวจช่องว่าง และส่งออกเอกสาร โดย AI เป็นเพียงผู้ช่วยเสนอ ไม่ใช่ผู้ตัดสิน
        </p>
        <div className="hero-actions animate-up delay-3">
          <a href="/login" className="btn-primary" data-testid="hero-start" onClick={e => { e.preventDefault(); router.push('/login'); }}>เริ่มใช้งาน →</a>
          <a href="#flow" className="btn-secondary">ดูขั้นตอน</a>
        </div>
      </div>

      <div className="hero-card-wrap animate-up delay-2">
        <div className="hero-card">
          <div className="card-header">
            <div className="card-title">8 เกณฑ์ · 53 ข้อ</div>
            <div className="live-badge"><div className="live-dot" />ข้อมูลเดโม่</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {CRITERIA.map(([no, name, n]) => (
              <div key={no} className="aq-hero-row">
                <span className="aq-hero-no">{no}</span>
                <span style={{ flex: 1 }}>{name}</span>
                <span className="aq-muted">{n} ข้อ</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useToast } from '@/context/ToastContext';

export default function ShowcaseSection() {
  const { showToast } = useToast();

  return (
    <>
      {/* Showcase 1 — ลงชื่อเข้าเรียน */}
      <section className="showcase-section" id="signin">
        <div className="showcase-layout">
          <div className="showcase-copy">
            <div className="showcase-eyebrow">ฟีเจอร์ที่ 01</div>
            <h2 className="showcase-title">ลงชื่อเข้าเรียน<br /><em>ใน 3 ขั้นตอน</em></h2>
            <p className="showcase-desc">นักเรียนเช็คชื่อได้ทั้งแบบกรอกรหัส หรือสแกน QR Code ระบบบันทึกเวลาและแจ้งสถานะให้ผู้ปกครองทันที</p>
            <div className="showcase-points">
              {[
                { icon: '⚡', title: 'เร็ว ภายใน 5 วินาที', sub: 'QR Code หรือรหัส 5 หลัก ไม่ต้องรอคิว' },
                { icon: '🔔', title: 'แจ้งเตือน Line / SMS', sub: 'ผู้ปกครองรู้ทันทีเมื่อบุตรหลานมาถึง' },
                { icon: '📍', title: 'บันทึกพิกัด GPS', sub: 'ยืนยันตำแหน่งการเช็คชื่อแบบ real-time' },
              ].map((p, i) => (
                <div key={i} className="point-item">
                  <div className="point-icon">{p.icon}</div>
                  <div>
                    <div className="point-title">{p.title}</div>
                    <div className="point-sub">{p.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="showcase-cta-row">
              <button className="btn-primary" onClick={() => showToast('ติดต่อทีมงานเพื่อนัดสาธิต...')}>ดูรายละเอียดเพิ่มเติม →</button>
              <span className="showcase-hint">ทดลองใช้ฟรี 30 วัน</span>
            </div>
          </div>

          <div className="showcase-mockup-wrap">
            <div className="mockup-label">ตัวอย่างหน้าจอระบบ</div>
            <div className="browser-frame">
              <div className="browser-bar">
                <div className="browser-dots">
                  <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                </div>
                <div className="browser-url">eduflow.th/checkin</div>
              </div>
              <div className="browser-body">
                <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 500, color: 'var(--brown-dark)', marginBottom: 2 }}>ลงชื่อเข้าเรียน</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>กรอกข้อมูลเพื่อบันทึกการเข้าเรียน</div>
                  </div>
                  {[{ label: 'รหัสนักเรียน', val: '12345' }, { label: 'ชั้นเรียน', val: 'ม.1/1 — คณิตศาสตร์ ▾' }, { label: 'คาบเรียน', val: 'คาบที่ 3 (10:00 – 11:00) ▾' }].map((f, i) => (
                    <div key={i} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{f.label}</div>
                      <div style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 7, padding: '0.4rem 0.7rem', fontSize: '0.75rem', color: 'var(--text-body)' }}>{f.val}</div>
                    </div>
                  ))}
                  <div style={{ background: 'var(--brown-dark)', color: 'var(--cream)', borderRadius: 7, padding: '0.55rem', fontSize: '0.72rem', fontWeight: 500, textAlign: 'center', marginTop: '0.5rem' }}>✓ ยืนยันการลงชื่อเข้าเรียน</div>
                  <div style={{ marginTop: '0.75rem', background: 'var(--brown-dark)', color: 'var(--cream)', borderRadius: 8, padding: '0.55rem 0.9rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5C8A5C', flexShrink: 0 }} />
                    <span>🟢 ลงชื่อสำเร็จ · ธนาพร สุขใจ · มาทัน 08:02 น.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase 2 — Dashboard เรียลไทม์ */}
      <section className="showcase-section showcase-alt" id="attendance">
        <div className="showcase-layout showcase-reverse">
          <div className="showcase-copy">
            <div className="showcase-eyebrow">ฟีเจอร์ที่ 02</div>
            <h2 className="showcase-title">Dashboard<br /><em>เรียลไทม์</em></h2>
            <p className="showcase-desc">ผู้บริหารและครูเห็นภาพรวมการเข้าเรียนทั้งโรงเรียน กรองตามชั้นเรียน วิชา หรือช่วงเวลาได้ทันที</p>
            <div className="showcase-points">
              {[
                { icon: '📊', title: 'รายงานอัตโนมัติ', sub: 'ระบบคำนวณสถิติและสร้าง PDF พร้อมส่งออกข้อมูล' },
                { icon: '📩', title: 'แจ้งเตือนผู้ปกครอง', sub: 'ส่งข้อความ Line / SMS อัตโนมัติเมื่อนักเรียนขาดเรียน' },
                { icon: '🔍', title: 'วิเคราะห์แนวโน้ม', sub: 'ติดตามแพทเทิร์นการขาดเรียนและป้องกันล่วงหน้า' },
              ].map((p, i) => (
                <div key={i} className="point-item">
                  <div className="point-icon">{p.icon}</div>
                  <div>
                    <div className="point-title">{p.title}</div>
                    <div className="point-sub">{p.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="showcase-cta-row">
              <button className="btn-primary" onClick={() => showToast('ติดต่อทีมงานเพื่อนัดสาธิต...')}>ดูรายละเอียดเพิ่มเติม →</button>
            </div>
          </div>

          <div className="showcase-mockup-wrap">
            <div className="mockup-label">ตัวอย่างหน้าจอระบบ</div>
            <div className="browser-frame">
              <div className="browser-bar">
                <div className="browser-dots">
                  <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                </div>
                <div className="browser-url">eduflow.th/dashboard</div>
              </div>
              <div className="browser-body">
                <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--cream-dark)' }}>
                    {['วันนี้', 'สัปดาห์นี้', 'เดือนนี้'].map((tab, i) => (
                      <div key={i} style={{ fontSize: '0.58rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: i === 0 ? 'var(--brown-dark)' : 'transparent', color: i === 0 ? 'var(--cream)' : 'var(--text-muted)' }}>{tab}</div>
                    ))}
                  </div>
                  <div style={{ padding: '0 0.25rem' }}>
                    {[{ name: 'สมใจ ใจดี', time: '08:02', status: 'มาทัน', cls: 'mock-pill-ok' }, { name: 'ธนา สุขใจ', time: '08:15', status: 'มาสาย', cls: 'mock-pill-late' }, { name: 'มาลี วาดเก่ง', time: '—', status: 'ขาดเรียน', cls: 'mock-pill-absent' }].map((r, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px', alignItems: 'center', padding: '0.45rem 0.65rem', borderTop: '1px solid var(--border)', fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 600, color: 'var(--brown-deep)', flexShrink: 0 }}>
                            {r.name.slice(0, 2)}
                          </div>
                          {r.name}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.time}</span>
                        <span style={{ fontSize: '0.58rem', padding: '0.15rem 0.5rem', borderRadius: 50, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3, background: r.cls === 'mock-pill-ok' ? 'rgba(92,138,92,0.12)' : r.cls === 'mock-pill-late' ? 'rgba(196,128,74,0.12)' : 'rgba(160,80,80,0.12)', color: r.cls === 'mock-pill-ok' ? 'var(--success)' : r.cls === 'mock-pill-late' ? 'var(--late)' : 'var(--absent)' }}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '0.75rem 0.9rem', background: 'var(--cream-dark)', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[{ label: 'มาทัน', pct: 71, color: '#5C8A5C' }, { label: 'มาสาย', pct: 21, color: '#C4804A' }, { label: 'ขาดเรียน', pct: 8, color: '#A05050' }].map((b, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 28px', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{b.label}</span>
                        <div style={{ height: 4, background: 'var(--cream)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, width: `${b.pct}%`, background: b.color }} />
                        </div>
                        <span style={{ fontSize: '0.58rem', fontWeight: 600, color: b.color, textAlign: 'right' }}>{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

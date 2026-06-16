'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SCHOOL_LEVEL_SEGMENTS } from '@/lib/mock-data';

const DONUT_COLORS = SCHOOL_LEVEL_SEGMENTS.map(s => s.color);
const DONUT_DATA   = SCHOOL_LEVEL_SEGMENTS.map(s => s.pct);

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router    = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawDonut(ctx);
    // count-up animation
    document.querySelectorAll<HTMLElement>('.count-up').forEach(el => {
      const target = parseInt(el.dataset.target || '0', 10);
      let start = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = start.toLocaleString('th-TH');
        if (start >= target) clearInterval(timer);
      }, 16);
    });
  }, []);

  function drawDonut(ctx: CanvasRenderingContext2D) {
    const w = 300, h = 300, cx = w / 2, cy = h / 2, r = 110, inner = 72;
    ctx.clearRect(0, 0, w, h);
    let startAngle = -Math.PI / 2;
    DONUT_DATA.forEach((val, i) => {
      const slice = (val / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = DONUT_COLORS[i];
      ctx.fill();
      startAngle += slice;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
    ctx.fillStyle = '#F5F0E8';
    ctx.fill();
  }

  return (
    <section className="hero" id="home">
      <div className="hero-bg-circle" />

      <div className="hero-content">
        <div className="hero-tag animate-up">ระบบอำนวยความสะดวกโรงเรียน · 2567</div>
        <h1 className="animate-up delay-1">
          บริหาร<em>โรงเรียน</em><br />อย่างชาญฉลาด
        </h1>
        <p className="hero-desc animate-up delay-2">
          ระบบครบวงจรสำหรับการจัดการการเข้าเรียน ลงชื่อเข้าเรียน และติดตามผลนักเรียนแบบเรียลไทม์
          เพื่อโรงเรียนที่ดียิ่งขึ้น
        </p>
        <div className="hero-actions animate-up delay-3">
          <a href="#signin" className="btn-primary">เริ่มใช้งานเลย →</a>
          <a href="#attendance" className="btn-secondary">ดูรายงาน</a>
        </div>
      </div>

      <div className="hero-card-wrap animate-up delay-2">
        <div className="hero-card">
          <div className="card-header" style={{ marginBottom: '0.4rem' }}>
            <div className="card-title">ภาพรวมการใช้งานแพลตฟอร์ม</div>
            <div className="live-badge"><div className="live-dot" />อัปเดตแล้ว</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <canvas ref={canvasRef} width={300} height={300} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 600, color: 'var(--brown-dark)', lineHeight: 1 }}>847</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3 }}>โรงเรียน</div>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {SCHOOL_LEVEL_SEGMENTS.map((seg, i) => (
                <div
                  key={seg.key}
                  className="legend-row"
                  onClick={() => router.push(`/schools?level=${seg.key}`)}
                  style={{ background: `${seg.color}22`, border: `1px solid ${seg.color}66`, borderRadius: 9, padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: seg.color, flex: 1 }}>{seg.label}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 500, color: seg.color }}>{seg.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            {[{ target: 847, label: 'โรงเรียน' }, { target: 124500, label: 'นักเรียน' }, { target: 98, label: '% พึงพอใจ' }].map((kpi, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0.25rem 0', ...(i === 1 ? { borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' } : {}) }}>
                <div className="count-up" data-target={kpi.target} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontWeight: 600, color: 'var(--brown-deep)' }}>0</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 1 }}>{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

/**
 * กราฟแนวโน้ม (ADR-UI-001 tokens.md T1.4, pages.md P13) — inline SVG ไม่พึ่งสีอย่างเดียว
 * ค่าจริง = primary ทึบ 2.5 + วงกลม r4 · เป้าหมาย = muted ประ 6 4 · benchmark = info ประจุด 2 4 + สี่เหลี่ยม 7px
 * ป้ายชื่อที่ปลายเส้น (direct label) · ชื่อแกน Y "{ชื่อ} ({หน่วย})" · แกน X "ปีการศึกษา (พ.ศ.)" · ตัวเลขแกน toLocaleString('th-TH')
 * ใช้ข้อมูลล่าสุดไม่เกิน 5 ปี
 */
import type { MetricValue } from '@/lib/types';
import { InlineMessage } from './common';

const W = 560, H = 260, PL = 64, PR = 96, PT = 20, PB = 52;

function fmt(v: number): string {
  const r = Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return r.toLocaleString('th-TH');
}

export default function TrendChart({ code, name, unit, rows }: { code: string; name?: string; unit?: string; rows: MetricValue[] }) {
  const pts = [...rows].sort((a, b) => a.period - b.period).slice(-5);
  const short = pts.length < 3;
  const vals = pts.flatMap(p => [p.value, p.targetValue, p.benchmarkValue]).filter((v): v is number => typeof v === 'number');
  const lo = Math.min(0, ...vals), hi = Math.max(...vals, 1);
  const pad = (hi - lo) * 0.1 || 1;
  const y0 = lo, y1 = hi + pad;
  const x = (i: number) => PL + (pts.length === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (pts.length - 1));
  const y = (v: number) => PT + (1 - (v - y0) / (y1 - y0)) * (H - PT - PB);
  const line = (get: (p: MetricValue) => number | undefined) =>
    pts.map((p, i) => ({ v: get(p), i })).filter((o): o is { v: number; i: number } => typeof o.v === 'number');
  const path = (arr: { v: number; i: number }[]) => arr.map((o, k) => `${k ? 'L' : 'M'}${x(o.i).toFixed(1)},${y(o.v).toFixed(1)}`).join(' ');
  const main = line(p => p.value), tgt = line(p => p.targetValue), bm = line(p => p.benchmarkValue);
  const ticks = [y0, (y0 + y1) / 2, y1];
  const yTitle = `${name ?? code}${unit ? ` (${unit})` : ''}`;
  const desc = `กราฟแนวโน้ม ${code} ${pts.map(p => `ปี ${p.period} ค่า ${p.value}`).join(', ')}`;
  const end = (arr: { v: number; i: number }[]) => arr[arr.length - 1];
  const bmSource = pts.find(p => p.benchmarkSource)?.benchmarkSource;

  return (
    <figure className="aq-chart" data-testid={`trend-${code}`}>
      <figcaption className="aq-h3">{code}{name ? ` — ${name}` : ''}{unit ? ` (${unit})` : ''}</figcaption>
      {short && (
        <InlineMessage tone="warn" testId={`trend-warn-${code}`}>
          {`ข้อมูลมี ${pts.length} ปี (น้อยกว่า 3 ปี) แนวโน้มอาจยังไม่น่าเชื่อถือ ควรเพิ่มข้อมูลย้อนหลังให้ครบ 3–5 ปี`}
        </InlineMessage>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc} className="aq-chart-svg">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} strokeWidth="1" style={{ stroke: 'var(--c-border-subtle)' }} />
            <text x={PL - 8} y={y(t) + 4} textAnchor="end" className="aq-chart-label aq-chart-text">{fmt(t)}</text>
          </g>
        ))}
        {pts.map((p, i) => <text key={p.period} x={x(i)} y={H - PB + 20} textAnchor="middle" className="aq-chart-label aq-chart-text">{p.period}</text>)}
        <text x={(PL + W - PR) / 2} y={H - 8} textAnchor="middle" className="aq-chart-label aq-chart-text">ปีการศึกษา (พ.ศ.)</text>
        <text transform={`translate(14 ${(PT + H - PB) / 2}) rotate(-90)`} textAnchor="middle" className="aq-chart-label aq-chart-text">{yTitle}</text>

        {bm.length > 0 && <>
          <path d={path(bm)} fill="none" strokeWidth="2" strokeDasharray="2 4" style={{ stroke: 'var(--c-info)' }} data-testid={`trend-bm-${code}`} />
          {bm.map(o => <rect key={o.i} x={x(o.i) - 3.5} y={y(o.v) - 3.5} width="7" height="7" style={{ fill: 'var(--c-info)' }} />)}
          <text x={x(end(bm).i) + 10} y={y(end(bm).v) + 4} className="aq-chart-label" style={{ fill: 'var(--c-info)' }}>benchmark</text>
        </>}
        {tgt.length > 0 && <>
          <path d={path(tgt)} fill="none" strokeWidth="2" strokeDasharray="6 4" style={{ stroke: 'var(--c-muted)' }} data-testid={`trend-target-${code}`} />
          <text x={x(end(tgt).i) + 10} y={y(end(tgt).v) + 4} className="aq-chart-label" style={{ fill: 'var(--c-muted)' }}>เป้าหมาย</text>
        </>}
        {main.length > 1 && <path d={path(main)} fill="none" strokeWidth="2.5" style={{ stroke: 'var(--c-primary)' }} />}
        {main.map(o => (
          <g key={o.i}>
            <circle cx={x(o.i)} cy={y(o.v)} r="4" style={{ fill: 'var(--c-primary)' }}><title>{`ปี ${pts[o.i].period}: ${o.v}`}</title></circle>
            <text x={x(o.i)} y={y(o.v) - 10} textAnchor="middle" className="aq-chart-label aq-chart-value">{fmt(o.v)}</text>
          </g>
        ))}
        {main.length > 0 && <text x={x(end(main).i) + 10} y={y(end(main).v) + 18} className="aq-chart-label" style={{ fill: 'var(--c-primary)' }}>ค่าจริง</text>}
      </svg>
      <div className="aq-legend">
        <ul className="aq-legend__list">
          <li><i className="aq-line-key aq-line-key--actual" />ค่าจริง</li>
          {tgt.length > 0 && <li><i className="aq-line-key aq-line-key--target" />เป้าหมาย</li>}
          {bm.length > 0 && <li><i className="aq-line-key aq-line-key--bm" />benchmark{bmSource ? ` (${bmSource})` : ''}</li>}
        </ul>
      </div>
    </figure>
  );
}

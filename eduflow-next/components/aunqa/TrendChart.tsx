'use client';

import type { MetricValue } from '@/lib/types';

const W = 520, H = 220, PL = 44, PR = 16, PT = 14, PB = 30;

/** กราฟแนวโน้ม (inline SVG) — เส้นค่าจริง + เป้าหมาย + benchmark; ใช้ข้อมูลล่าสุดไม่เกิน 5 ปี */
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
  const ticks = [y0, (y0 + y1) / 2, y1].map(v => Math.round(v * 10) / 10);
  const desc = `กราฟแนวโน้ม ${code} ${pts.map(p => `ปี ${p.period} ค่า ${p.value}`).join(', ')}`;

  return (
    <figure className="aq-chart" data-testid={`trend-${code}`}>
      <figcaption className="aq-h3">{code}{name ? ` — ${name}` : ''}{unit ? ` (${unit})` : ''}</figcaption>
      {short && <div className="auth-alert auth-alert-warn" role="status" data-testid={`trend-warn-${code}`}>ข้อมูลมี {pts.length} ปี (น้อยกว่า 3 ปี) แนวโน้มอาจยังไม่น่าเชื่อถือ ควรเพิ่มข้อมูลย้อนหลังให้ครบ 3–5 ปี</div>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc} className="aq-chart-svg">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={PL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{t}</text>
          </g>
        ))}
        {pts.map((p, i) => <text key={p.period} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{p.period}</text>)}
        {bm.length > 0 && <path d={path(bm)} fill="none" stroke="#B5713C" strokeWidth="2" strokeDasharray="2 4" data-testid={`trend-bm-${code}`} />}
        {tgt.length > 0 && <path d={path(tgt)} fill="none" stroke="#8A9E7E" strokeWidth="2" strokeDasharray="6 4" data-testid={`trend-target-${code}`} />}
        {main.length > 1 && <path d={path(main)} fill="none" stroke="var(--brown-dark)" strokeWidth="2.5" />}
        {main.map(o => (
          <g key={o.i}>
            <circle cx={x(o.i)} cy={y(o.v)} r="4" fill="var(--brown-dark)"><title>{`ปี ${pts[o.i].period}: ${o.v}`}</title></circle>
            <text x={x(o.i)} y={y(o.v) - 8} textAnchor="middle" fontSize="10" fill="var(--brown-ink)">{o.v}</text>
          </g>
        ))}
      </svg>
      <div className="aq-legend">
        <span><i className="aq-line-key" style={{ background: 'var(--brown-dark)' }} />ค่าจริง</span>
        {tgt.length > 0 && <span><i className="aq-line-key" style={{ background: '#8A9E7E' }} />เป้าหมาย</span>}
        {bm.length > 0 && <span><i className="aq-line-key" style={{ background: '#B5713C' }} />benchmark{pts.find(p => p.benchmarkSource)?.benchmarkSource ? ` (${pts.find(p => p.benchmarkSource)!.benchmarkSource})` : ''}</span>}
      </div>
    </figure>
  );
}

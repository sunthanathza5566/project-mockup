'use client';

/**
 * กราฟแนวโน้ม (ADR-UI-001 tokens.md T1.4, pages.md P13 · saas-spec §P13 · friendly-spec §F13 การ์ด rounded-xl) — inline SVG ไม่พึ่งสีอย่างเดียว
 * ค่าจริง = chart-1 ทึบ 2.5 + วงกลม r4 · เป้าหมาย = chart-4 ประ 6 4 · benchmark = chart-2 ประจุด 2 4 + สี่เหลี่ยม 7px · กริด stroke-border
 * ป้ายชื่อที่ปลายเส้น (direct label, เลื่อนไม่ให้ซ้อน) · ชื่อแกน Y "{ชื่อ} ({หน่วย})" · แกน X "ปีการศึกษา (พ.ศ.)"
 * U3 (BUG-0001-U2Q-1 / UX-U3-2): วาดที่ขนาดจริงของกล่อง (viewBox = px จริง) → ป้าย 13px เห็นเป็น 13px ทุกจอ ·
 * tick ปัดเป็นเลขสวย (1/2/2.5/5 × 10^n) · หน่วยนับ (คน/ครั้ง/ชิ้น/บาท/ปี) และค่าที่เป็นจำนวนเต็มทั้งหมด → tick จำนวนเต็ม
 * ใช้ข้อมูลล่าสุดไม่เกิน 5 ปี
 */
import { useEffect, useRef, useState } from 'react';
import type { MetricValue } from '@/lib/types';
import { cn } from '@/lib/ui/cn';
import { InlineMessage } from './common';

const H = 260, PT = 24, PB = 52, LABEL_GAP = 20;

/**
 * สีชุดข้อมูลตาม earth-tokens §E1 (normative): ค่าจริง = chart-1 (primary) · benchmark = chart-2 (info) ·
 * เป้าหมาย = chart-4 (muted-foreground, เส้นประ) · chart-3 (clay) = ชุดที่ 3 ถ้ามีเส้นเพิ่ม (คู่ #40 clay/card)
 * ทุกสีเป็น token จึงสลับธีมสว่าง/มืดเอง · literal เต็ม (JIT ต้องสแกนเจอ)
 */
type SeriesKey = 'actual' | 'target' | 'bm';
const SERIES: Record<SeriesKey, { stroke: string; fill: string; dash?: string }> = {
  actual: { stroke: 'stroke-chart-1', fill: 'fill-chart-1' },
  bm: { stroke: 'stroke-chart-2', fill: 'fill-chart-2', dash: '2 4' },
  target: { stroke: 'stroke-chart-4', fill: 'fill-chart-4', dash: '6 4' },
};
const COUNT_UNITS = new Set(['คน', 'ครั้ง', 'ชิ้น', 'บาท', 'ปี', 'รายการ', 'เรื่อง', 'วิชา']);

/** ช่วงแกนและ tick แบบเลขสวย */
export function niceTicks(lo: number, hi: number, integer: boolean, target = 4): number[] {
  if (hi <= lo) hi = lo + 1;
  const raw = (hi - lo) / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) ?? 10 * p;
  if (integer) step = Math.max(1, Math.ceil(step));
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v < hi + step * 0.999; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function fmt(v: number, integer: boolean): string {
  const r = integer ? Math.round(v) : Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
  return r.toLocaleString('th-TH');
}

/** เลื่อนป้ายปลายเส้นในแนวตั้งไม่ให้ซ้อนกัน (ห่างอย่างน้อย LABEL_GAP) และไม่ออกนอกพื้นที่กราฟ */
function spread<T extends { y: number }>(items: T[], top: number, bottom: number): T[] {
  const s = [...items].sort((a, b) => a.y - b.y).map(o => ({ ...o }));
  for (let i = 1; i < s.length; i++) if (s[i].y - s[i - 1].y < LABEL_GAP) s[i].y = s[i - 1].y + LABEL_GAP;
  const over = s.length ? s[s.length - 1].y - bottom : 0;
  if (over > 0) s.forEach(o => { o.y -= over; });
  if (s.length && s[0].y < top) { const d = top - s[0].y; s.forEach(o => { o.y += d; }); }
  return s;
}

export default function TrendChart({ code, name, unit, rows }: { code: string; name?: string; unit?: string; rows: MetricValue[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => { const w = Math.round(el.clientWidth); if (w > 0) setW(w); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts = [...rows].sort((a, b) => a.period - b.period).slice(-5);
  const short = pts.length < 3;
  const vals = pts.flatMap(p => [p.value, p.targetValue, p.benchmarkValue]).filter((v): v is number => typeof v === 'number');
  const integer = (!!unit && COUNT_UNITS.has(unit)) || (vals.length > 0 && vals.every(v => Number.isInteger(v)));
  // เผื่อหัวกราฟ ~8% ให้ป้ายค่าบนจุดสูงสุดไม่ชนเส้น/ตัวเลขแกนบนสุด
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(...vals, integer ? 1 : 0.1) * 1.08, integer);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const tickW = Math.max(...ticks.map(t => fmt(t, integer).length)) * 8;
  const PL = 44 + tickW;                              // ชื่อแกน Y (หมุน, กว้าง ~26) + ช่องว่าง + ตัวเลข tick + 8
  const PR = W < 420 ? 80 : 96;                       // ป้ายปลายเส้น
  const plotW = Math.max(80, W - PL - PR);
  const INSET = 20; // จุดแรก/สุดท้ายห่างขอบพื้นที่กราฟ (ป้ายค่าไม่ทับตัวเลขแกน Y)
  const x = (i: number) => PL + (pts.length === 1 ? plotW / 2 : INSET + (i * (plotW - INSET * 2)) / (pts.length - 1));
  const y = (v: number) => PT + (1 - (v - y0) / (y1 - y0 || 1)) * (H - PT - PB);
  const line = (get: (p: MetricValue) => number | undefined) =>
    pts.map((p, i) => ({ v: get(p), i })).filter((o): o is { v: number; i: number } => typeof o.v === 'number');
  const path = (arr: { v: number; i: number }[]) => arr.map((o, k) => `${k ? 'L' : 'M'}${x(o.i).toFixed(1)},${y(o.v).toFixed(1)}`).join(' ');
  const main = line(p => p.value), tgt = line(p => p.targetValue), bm = line(p => p.benchmarkValue);
  const title = name ?? code;
  // ชื่อแกน Y ต้องไม่ยาวเกินความสูงพื้นที่กราฟ (ประมาณ 7.5px/ตัวอักษรที่ 13px) — ยาวเกิน = ใช้หน่วยอย่างเดียว (ชื่อเต็มอยู่ที่หัวการ์ด)
  const yFull = `${title}${unit ? ` (${unit})` : ''}`;
  const yTitle = yFull.length * 7.5 <= H - PT - PB ? yFull : (unit ? `หน่วย: ${unit}` : title);
  const desc = `กราฟแนวโน้ม ${title} ${pts.map(p => `ปี ${p.period} ค่า ${p.value}`).join(', ')}`;
  const end = (arr: { v: number; i: number }[]) => arr[arr.length - 1];
  const bmSource = pts.find(p => p.benchmarkSource)?.benchmarkSource;
  // ป้ายค่าบนจุด: ถ้าจุดชิดกันเกินไป แสดงเฉพาะปีล่าสุด (ค่าทุกปีอยู่ใน <title> และ aria-label)
  const spacing = pts.length > 1 ? (plotW - INSET * 2) / (pts.length - 1) : plotW;
  const valueW = Math.max(...main.map(o => fmt(o.v, integer).length)) * 8;
  const showAllValues = spacing >= valueW + 8;

  type EndLabel = { key: SeriesKey; y: number; text: string; x: number };
  const endLabels: EndLabel[] = [];
  if (main.length) endLabels.push({ key: 'actual', y: y(end(main).v) + 4, text: 'ค่าจริง', x: x(end(main).i) + 10 });
  if (tgt.length) endLabels.push({ key: 'target', y: y(end(tgt).v) + 4, text: 'เป้าหมาย', x: x(end(tgt).i) + 10 });
  if (bm.length) endLabels.push({ key: 'bm', y: y(end(bm).v) + 4, text: 'benchmark', x: x(end(bm).i) + 10 });
  const placed = spread(endLabels, PT + 4, H - PB);

  return (
    <figure className="m-0 min-w-0 space-y-4 rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6" data-testid={`trend-${code}`}>
      <figcaption className="text-lg font-semibold text-foreground">{`${title}${unit ? ` (${unit})` : ''}`}</figcaption>
      {short && (
        <InlineMessage tone="warn" testId={`trend-warn-${code}`}>
          {`ข้อมูลมี ${pts.length} ปี (น้อยกว่า 3 ปี) แนวโน้มอาจยังไม่น่าเชื่อถือ ควรเพิ่มข้อมูลย้อนหลังให้ครบ 3–5 ปี`}
        </InlineMessage>
      )}
      <div ref={box} className="w-full min-w-0 overflow-hidden">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc} className="block max-w-none">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PL} x2={PL + plotW} y1={y(t)} y2={y(t)} strokeWidth="1" className="stroke-border" />
              <text x={PL - 8} y={y(t) + 4} textAnchor="end" className="aq-chart-label">{fmt(t, integer)}</text>
            </g>
          ))}
          {pts.map((p, i) => <text key={p.period} x={x(i)} y={H - PB + 20} textAnchor="middle" className="aq-chart-label">{p.period}</text>)}
          <text x={PL + plotW / 2} y={H - 8} textAnchor="middle" className="aq-chart-label">ปีการศึกษา (พ.ศ.)</text>
          <text transform={`translate(14 ${(PT + H - PB) / 2}) rotate(-90)`} textAnchor="middle" className="aq-chart-label">{yTitle}</text>

          {bm.length > 0 && <>
            <path d={path(bm)} fill="none" strokeWidth="2" strokeDasharray="2 4" className={SERIES.bm.stroke} data-testid={`trend-bm-${code}`} />
            {bm.map(o => <rect key={o.i} x={x(o.i) - 3.5} y={y(o.v) - 3.5} width="7" height="7" className={SERIES.bm.fill} />)}
          </>}
          {tgt.length > 0 && (
            <path d={path(tgt)} fill="none" strokeWidth="2" strokeDasharray="6 4" className={SERIES.target.stroke} data-testid={`trend-target-${code}`} />
          )}
          {main.length > 1 && <path d={path(main)} fill="none" strokeWidth="2.5" className={SERIES.actual.stroke} />}
          {main.map((o, k) => (
            <g key={o.i}>
              <circle cx={x(o.i)} cy={y(o.v)} r="4" className={cn(SERIES.actual.fill, 'stroke-card')} strokeWidth="1.5"><title>{`ปี ${pts[o.i].period}: ${fmt(o.v, integer)}`}</title></circle>
              {(showAllValues || k === main.length - 1) && (
                <text x={x(o.i)} y={y(o.v) - 10} textAnchor="middle" className="aq-chart-label fill-foreground">{fmt(o.v, integer)}</text>
              )}
            </g>
          ))}
          {placed.map(l => <text key={l.key} x={l.x} y={l.y} className={cn('aq-chart-label', SERIES[l.key].fill)}>{l.text}</text>)}
        </svg>
      </div>
      <div className="aq-legend m-0 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t pt-3">
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
          <li className="inline-flex items-center gap-2 text-foreground"><LineKey k="actual" />ค่าจริง</li>
          {tgt.length > 0 && <li className="inline-flex items-center gap-2 text-foreground"><LineKey k="target" />เป้าหมาย</li>}
          {bm.length > 0 && <li className="inline-flex items-center gap-2 text-foreground"><LineKey k="bm" />{`benchmark${bmSource ? ` (${bmSource})` : ''}`}</li>}
        </ul>
        <p className="aq-meta m-0">{`รหัสตัวชี้วัด ${code}`}</p>
      </div>
    </figure>
  );
}

/** ตัวอย่างเส้นใน legend — รูปเส้นเดียวกับในกราฟ (ทึบ/ประ/จุด+สี่เหลี่ยม) ไม่พึ่งสีอย่างเดียว */
function LineKey({ k }: { k: SeriesKey }) {
  const s = SERIES[k];
  return (
    <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true" className="shrink-0">
      <line x1="1" x2="27" y1="5" y2="5" strokeWidth={k === 'actual' ? 2.5 : 2} strokeDasharray={s.dash} strokeLinecap="round" className={s.stroke} />
      {k === 'actual' && <circle cx="14" cy="5" r="3.5" className={s.fill} />}
      {k === 'bm' && <rect x="10.5" y="1.5" width="7" height="7" className={s.fill} />}
    </svg>
  );
}

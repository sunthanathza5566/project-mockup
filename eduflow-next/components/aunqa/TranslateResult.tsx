'use client';

/**
 * ผลแปล AI-4 (saas-spec §P9 แผงผล AI + friendly-spec §F13 — earth · พฤติกรรมเดิม C-8 (3))
 * เทียบต้นฉบับ/คำแปล 2 คอลัมน์ (md) + เตือน (ต้องแปลต่อ = InlineMessage warn, post-check, PII token) + ยอมรับ ต่อท้าย/แทนที่
 * ปุ่ม primary เดียว = "ยอมรับคำแปล" · ทิ้ง = ghost · คง testid เดิมทั้งหมด
 */
import { useState } from 'react';
import type { AiRun } from '@/lib/types';
import type { TranslateRunOutput } from '@/lib/api';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { Badge, InlineMessage, ModelBadge } from './common';

/** token ที่ระบบปิดบังข้อมูลส่วนบุคคล (ดู lib/utils/pii.ts) — ถ้าติดมาในคำแปล ผู้ใช้ต้องแก้ก่อนใช้จริง */
const PII_TOKEN_RE = /\[(?:ID_CARD|EMAIL|STUDENT_ID|PHONE|REDACTED[A-Z_]*)\]/g;

export function findPiiTokens(text: string): string[] {
  return Array.from(new Set(text.match(PII_TOKEN_RE) ?? []));
}

/** กล่องข้อความผล AI (ต้นฉบับ/คำแปล) — พื้นการ์ด ขอบ 1px คงบรรทัดเดิม */
const DRAFT_BOX = 'max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-card p-4 text-base leading-relaxed text-foreground';
const CHECK_ROW = 'flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground';
const CHECK_INPUT = 'h-5 w-5 shrink-0 accent-primary';

export default function TranslateResult({ run, source, mode, setMode, onAccept, onDiscard, canAccept }: {
  run: AiRun; source: string; mode: 'append' | 'replace'; setMode: (m: 'append' | 'replace') => void;
  onAccept: () => void; onDiscard: () => void; canAccept: boolean;
}) {
  const out = run.output as unknown as TranslateRunOutput;
  const pc = run.postCheck;
  const piiTokens = findPiiTokens(out.translation);
  const [ackPii, setAckPii] = useState(false);
  const toEn = out.to === 'en';
  const blocked = piiTokens.length > 0 && !ackPii;
  const offline = run.model.startsWith('offline');

  return (
    <div className="mt-4 space-y-4 rounded-xl border bg-muted/40 p-4 animate-fade-in md:p-5" data-testid="ai-result">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info" icon="languages">{toEn ? 'แปล TH → EN' : 'แปล EN → TH'}</Badge>
        <span className="inline-flex items-center"><ModelBadge run={run} />{offline && <Term k="offline" label="โหมดในเครื่อง" />}</span>
        <span className="inline-flex items-center"><Badge tone="neutral" icon={false}>ปกปิดข้อมูลส่วนบุคคล {run.redactionCount} จุด</Badge><Term k="redaction" label="การปกปิดข้อมูลส่วนบุคคล" /></span>
        <Badge tone={pc.ok ? 'ok' : 'warn'} testId="postcheck">{pc.ok ? 'รหัสอ้างอิงและตัวเลขครบ' : 'รหัสอ้างอิงหรือตัวเลขไม่ครบ'}</Badge>
      </div>

      {out.needsHumanTranslation && (
        <InlineMessage tone="warn" testId="translate-needs-human" title="ต้องแปลต่อโดยผู้ใช้">
          โหมดในเครื่องแทนได้เฉพาะศัพท์เฉพาะทาง (glossary) ประโยคส่วนที่เหลือยังเป็นภาษาเดิม หลังยอมรับแล้วโปรดแปลส่วนที่เหลือเอง
        </InlineMessage>
      )}

      {!pc.ok && (
        <ul className="m-0 list-disc space-y-1 rounded-lg border border-warning/30 bg-warning-muted py-3 pl-9 pr-4 text-base text-foreground" data-testid="translate-postcheck-list">
          {pc.removedCitations.length > 0 && <li>ตัดการอ้างอิงที่ไม่มีจริงออกแล้ว: {pc.removedCitations.join(', ')}</li>}
          {pc.unknownNumbers.length > 0 && <li>ตัวเลขที่ไม่พบในต้นฉบับ: {pc.unknownNumbers.join(', ')}</li>}
          {pc.flaggedSentences.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}

      {piiTokens.length > 0 && (
        <InlineMessage tone="danger" testId="translate-pii-warn"
          title={`คำแปลมีข้อความแทนข้อมูลส่วนบุคคลที่ถูกปิดบัง ${piiTokens.join(' ')}`}>
          <p className="m-0">ข้อมูลจริงไม่ได้ถูกส่งไปแปล ควรแก้ในเอกสารให้เหมาะสมก่อนใช้</p>
          <label className={CHECK_ROW}>
            <input type="checkbox" className={CHECK_INPUT} checked={ackPii} onChange={e => setAckPii(e.target.checked)} data-testid="translate-pii-ack" />
            รับทราบ จะแก้ข้อความเหล่านี้เองหลังยอมรับ
          </label>
        </InlineMessage>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <h3 className="m-0 text-base font-semibold text-foreground">{toEn ? 'ต้นฉบับ (ไทย)' : 'ต้นฉบับ (English)'}</h3>
          <div className={DRAFT_BOX} data-testid="translate-source">{source}</div>
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="m-0 text-base font-semibold text-foreground">{toEn ? 'คำแปล (English)' : 'คำแปล (ไทย)'}</h3>
          <div className={DRAFT_BOX} data-testid="translate-output" lang={toEn ? 'en' : 'th'}>{out.translation}</div>
        </div>
      </div>

      {out.glossaryHits.length > 0 && (
        <p className="aq-meta m-0" data-testid="translate-glossary">ศัพท์เฉพาะที่ใช้ตาม glossary: {out.glossaryHits.join(', ')}</p>
      )}

      <fieldset className="m-0 flex flex-wrap items-center gap-x-6 gap-y-1 border-0 p-0">
        <legend className="sr-only">วิธีใส่คำแปล</legend>
        <label className={CHECK_ROW}><input type="radio" className={CHECK_INPUT} name="tr-mode" checked={mode === 'append'} onChange={() => setMode('append')} data-testid="tr-mode-append" /> ต่อท้ายข้อความเดิม</label>
        <label className={CHECK_ROW}><input type="radio" className={CHECK_INPUT} name="tr-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} data-testid="tr-mode-replace" /> แทนที่ทั้งหมด</label>
        <Term k="append_replace" label="ต่อท้าย / แทนที่" />
      </fieldset>
      {mode === 'replace' && <p className="aq-help m-0">{toEn ? 'จะเขียนทับข้อความฝั่ง English ทั้งหมด (เวอร์ชันเดิมยังกู้คืนได้จากประวัติ)' : 'จะเขียนทับข้อความฝั่งภาษาไทยทั้งหมด (เวอร์ชันเดิมยังกู้คืนได้จากประวัติ)'}</p>}

      <div className="flex flex-wrap items-start gap-2 border-t pt-4">
        <div className="flex flex-col items-start gap-1">
          <Button onClick={onAccept} disabled={!canAccept || blocked} data-testid="ai-accept">ยอมรับคำแปล</Button>
          {blocked && <p className="aq-btn-reason m-0">ติ๊กรับทราบเรื่องข้อมูลส่วนบุคคลก่อน</p>}
        </div>
        <Button variant="ghost" onClick={onDiscard} data-testid="ai-discard">ทิ้ง</Button>
      </div>
    </div>
  );
}

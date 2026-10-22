'use client';

/**
 * ผลแปล AI-4 (ADR-UI-001 pages.md P9 C-8 (3) — restyle, พฤติกรรมเดิม)
 * เทียบต้นฉบับ/คำแปล + เตือน (ต้องแปลต่อ = InlineMessage warn, post-check, PII token) + ยอมรับ ต่อท้าย/แทนที่
 */
import { useState } from 'react';
import type { AiRun } from '@/lib/types';
import type { TranslateRunOutput } from '@/lib/api';
import Term from '@/components/ui/Term';
import { Badge, InlineMessage, ModelBadge } from './common';

/** token ที่ระบบปิดบังข้อมูลส่วนบุคคล (ดู lib/utils/pii.ts) — ถ้าติดมาในคำแปล ผู้ใช้ต้องแก้ก่อนใช้จริง */
const PII_TOKEN_RE = /\[(?:ID_CARD|EMAIL|STUDENT_ID|PHONE|REDACTED[A-Z_]*)\]/g;

export function findPiiTokens(text: string): string[] {
  return Array.from(new Set(text.match(PII_TOKEN_RE) ?? []));
}

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
    <div className="aq-ai-result" data-testid="ai-result">
      <div className="aq-cluster">
        <Badge tone="info" icon="languages">{toEn ? 'แปล TH → EN' : 'แปล EN → TH'}</Badge>
        <span><ModelBadge run={run} />{offline && <Term k="offline" label="โหมดในเครื่อง" />}</span>
        <span><Badge tone="neutral" icon={false}>ปกปิดข้อมูลส่วนบุคคล {run.redactionCount} จุด</Badge><Term k="redaction" label="การปกปิดข้อมูลส่วนบุคคล" /></span>
        <Badge tone={pc.ok ? 'ok' : 'warn'} testId="postcheck">{pc.ok ? 'รหัสอ้างอิงและตัวเลขครบ' : 'รหัสอ้างอิงหรือตัวเลขไม่ครบ'}</Badge>
      </div>

      {out.needsHumanTranslation && (
        <InlineMessage tone="warn" testId="translate-needs-human" title="ต้องแปลต่อโดยผู้ใช้">
          โหมดในเครื่องแทนได้เฉพาะศัพท์เฉพาะทาง (glossary) ประโยคส่วนที่เหลือยังเป็นภาษาเดิม หลังยอมรับแล้วโปรดแปลส่วนที่เหลือเอง
        </InlineMessage>
      )}

      {!pc.ok && (
        <ul className="aq-warnlist" data-testid="translate-postcheck-list">
          {pc.removedCitations.length > 0 && <li>ตัดการอ้างอิงที่ไม่มีจริงออกแล้ว: {pc.removedCitations.join(', ')}</li>}
          {pc.unknownNumbers.length > 0 && <li>ตัวเลขที่ไม่พบในต้นฉบับ: {pc.unknownNumbers.join(', ')}</li>}
          {pc.flaggedSentences.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}

      {piiTokens.length > 0 && (
        <InlineMessage tone="danger" testId="translate-pii-warn"
          title={`คำแปลมีข้อความแทนข้อมูลส่วนบุคคลที่ถูกปิดบัง ${piiTokens.join(' ')}`}>
          <p>ข้อมูลจริงไม่ได้ถูกส่งไปแปล ควรแก้ในเอกสารให้เหมาะสมก่อนใช้</p>
          <label className="aq-check">
            <input type="checkbox" checked={ackPii} onChange={e => setAckPii(e.target.checked)} data-testid="translate-pii-ack" />
            รับทราบ จะแก้ข้อความเหล่านี้เองหลังยอมรับ
          </label>
        </InlineMessage>
      )}

      <div className="aq-translate-pair">
        <div>
          <h3 className="aq-h3">{toEn ? 'ต้นฉบับ (ไทย)' : 'ต้นฉบับ (English)'}</h3>
          <div className="aq-ai-draft aq-prose--pre" data-testid="translate-source">{source}</div>
        </div>
        <div>
          <h3 className="aq-h3">{toEn ? 'คำแปล (English)' : 'คำแปล (ไทย)'}</h3>
          <div className="aq-ai-draft aq-prose--pre" data-testid="translate-output" lang={toEn ? 'en' : 'th'}>{out.translation}</div>
        </div>
      </div>

      {out.glossaryHits.length > 0 && (
        <p className="aq-meta" data-testid="translate-glossary">ศัพท์เฉพาะที่ใช้ตาม glossary: {out.glossaryHits.join(', ')}</p>
      )}

      <fieldset className="aq-cluster aq-mt-2">
        <legend className="aq-sr-only">วิธีใส่คำแปล</legend>
        <label className="aq-check"><input type="radio" name="tr-mode" checked={mode === 'append'} onChange={() => setMode('append')} data-testid="tr-mode-append" /> ต่อท้ายข้อความเดิม</label>
        <label className="aq-check"><input type="radio" name="tr-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} data-testid="tr-mode-replace" /> แทนที่ทั้งหมด</label>
        <Term k="append_replace" label="ต่อท้าย / แทนที่" />
      </fieldset>
      {mode === 'replace' && <p className="aq-help">{toEn ? 'จะเขียนทับข้อความฝั่ง English ทั้งหมด (เวอร์ชันเดิมยังกู้คืนได้จากประวัติ)' : 'จะเขียนทับข้อความฝั่งภาษาไทยทั้งหมด (เวอร์ชันเดิมยังกู้คืนได้จากประวัติ)'}</p>}

      <div className="aq-actions aq-mt-4">
        <span className="aq-btn-with-reason">
          <button type="button" className="aq-btn aq-btn-primary" onClick={onAccept} disabled={!canAccept || blocked} data-testid="ai-accept">
            ยอมรับคำแปล
          </button>
          {blocked && <span className="aq-btn-reason">ติ๊กรับทราบเรื่องข้อมูลส่วนบุคคลก่อน</span>}
        </span>
        <button type="button" className="aq-btn aq-btn-ghost" onClick={onDiscard} data-testid="ai-discard">ทิ้ง</button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { AiRun } from '@/lib/types';
import type { TranslateRunOutput } from '@/lib/api';
import { Badge, ModelBadge } from './common';

/** token ที่ระบบปิดบังข้อมูลส่วนบุคคล (ดู lib/utils/pii.ts) — ถ้าติดมาในคำแปล ผู้ใช้ต้องแก้ก่อนใช้จริง */
const PII_TOKEN_RE = /\[(?:ID_CARD|EMAIL|STUDENT_ID|PHONE|REDACTED[A-Z_]*)\]/g;

export function findPiiTokens(text: string): string[] {
  return Array.from(new Set(text.match(PII_TOKEN_RE) ?? []));
}

/** ผลแปล AI-4: เทียบต้นฉบับ/คำแปล + เตือน (ต้องแปลต่อ, post-check, PII token) + ยอมรับ append/replace */
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

  return (
    <div className="aq-ai-result" data-testid="ai-result">
      <div className="aq-chips">
        <Badge tone="info">{toEn ? 'แปล TH → EN' : 'แปล EN → TH'}</Badge>
        <ModelBadge run={run} />
        <Badge title="จำนวนข้อมูลส่วนบุคคลที่ถูกปกปิดก่อนส่ง">ปกปิด {run.redactionCount} จุด</Badge>
        <Badge tone={pc.ok ? 'ok' : 'warn'} testId="postcheck">{pc.ok ? 'รหัสอ้างอิงและตัวเลขครบ' : 'รหัสอ้างอิงหรือตัวเลขไม่ครบ'}</Badge>
      </div>

      {out.needsHumanTranslation && (
        <div className="auth-alert auth-alert-warn" role="alert" data-testid="translate-needs-human">
          <div><strong>ต้องแปลต่อโดยผู้ใช้</strong> — โหมด offline แทนได้เฉพาะศัพท์เฉพาะทาง (glossary) ประโยคส่วนที่เหลือยังเป็นภาษาเดิม
          หลังยอมรับแล้วโปรดแปลส่วนที่เหลือเอง</div>
        </div>
      )}

      {!pc.ok && (
        <ul className="aq-warnlist" data-testid="translate-postcheck-list">
          {pc.removedCitations.length > 0 && <li>ตัดการอ้างอิงที่ไม่มีจริงออกแล้ว: {pc.removedCitations.join(', ')}</li>}
          {pc.unknownNumbers.length > 0 && <li>ตัวเลขที่ไม่พบในต้นฉบับ: {pc.unknownNumbers.join(', ')}</li>}
          {pc.flaggedSentences.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}

      {piiTokens.length > 0 && (
        <div className="auth-alert auth-alert-err" role="alert" data-testid="translate-pii-warn">
          คำแปลมีข้อความแทนข้อมูลส่วนบุคคลที่ถูกปิดบัง {piiTokens.join(' ')} — ข้อมูลจริงไม่ได้ถูกส่งไปแปล
          ควรแก้ในเอกสารให้เหมาะสมก่อนใช้
          <label className="aq-check" style={{ display: 'block', marginTop: '0.4rem' }}>
            <input type="checkbox" checked={ackPii} onChange={e => setAckPii(e.target.checked)} data-testid="translate-pii-ack" />
            {' '}รับทราบ จะแก้ข้อความเหล่านี้เองหลังยอมรับ
          </label>
        </div>
      )}

      <div className="aq-translate-pair">
        <div>
          <div className="aq-h3">{toEn ? 'ต้นฉบับ (ไทย)' : 'ต้นฉบับ (English)'}</div>
          <pre className="aq-ai-draft" data-testid="translate-source">{source}</pre>
        </div>
        <div>
          <div className="aq-h3">{toEn ? 'คำแปล (English)' : 'คำแปล (ไทย)'}</div>
          <pre className="aq-ai-draft" data-testid="translate-output" lang={toEn ? 'en' : 'th'}>{out.translation}</pre>
        </div>
      </div>

      {out.glossaryHits.length > 0 && (
        <div className="aq-muted" style={{ fontSize: '0.8rem' }} data-testid="translate-glossary">
          ศัพท์เฉพาะที่ใช้ตาม glossary: {out.glossaryHits.join(', ')}
        </div>
      )}

      <div className="aq-form-inline">
        <label><input type="radio" name="tr-mode" checked={mode === 'append'} onChange={() => setMode('append')} data-testid="tr-mode-append" /> ต่อท้ายข้อความเดิม</label>
        <label><input type="radio" name="tr-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} data-testid="tr-mode-replace" /> แทนที่ทั้งหมด</label>
      </div>
      {mode === 'replace' && <div className="aq-muted" style={{ fontSize: '0.8rem' }}>{toEn ? 'จะเขียนทับข้อความฝั่ง English ทั้งหมด (เวอร์ชันเดิมยังกู้คืนได้จากประวัติ)' : 'จะเขียนทับข้อความฝั่งภาษาไทยทั้งหมด (เวอร์ชันเดิมยังกู้คืนได้จากประวัติ)'}</div>}

      <div className="aq-actions">
        <button className="aq-btn aq-btn-primary" onClick={onAccept} disabled={!canAccept || blocked} data-testid="ai-accept"
          title={blocked ? 'ติ๊กรับทราบเรื่องข้อมูลส่วนบุคคลก่อน' : undefined}>
          ยอมรับคำแปล
        </button>
        <button className="aq-btn" onClick={onDiscard} data-testid="ai-discard">ทิ้ง</button>
      </div>
    </div>
  );
}

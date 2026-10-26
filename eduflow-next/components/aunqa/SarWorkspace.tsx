'use client';

/**
 * Section editor (ADR-UI-001 pages.md P9)
 * - U3: เหตุผลที่ถูกส่งกลับ (UX-U3-1) ใต้หัวเรื่อง + แท็บประวัติ · กันเขียนทับข้ามแท็บด้วย baseUpdatedAt (U3P-2)
 *       → conflict = dialog บอกเหตุผลจริง (ข้อความ / สถานะ / เจ้าของ-กำหนดส่ง / คำแปล) · ประธาน: "เปิดข้อถัดไปในคิว"
 * - Stepper 4 ขั้น (C21) · 2 คอลัมน์ (เนื้อหา / แผงข้าง 3 แท็บ) · sticky action bar (C23) · save indicator (C24)
 * - Autosave (P3): debounce 1.5s + บันทึกทันทีเมื่อ blur / visibilitychange→hidden / beforeunload / เปลี่ยนภาษา /
 *   flushAll() (registerFlush — ADR 6.4) · onChange เรียก touchSession() (M3)
 * - session หายแต่บันทึกไม่ได้ (useAuth().sessionLost) → อ่านอย่างเดียว
 * - checklist ก่อนส่งตรวจ (P2) · toast "ไปข้อถัดไปของฉัน" (UX-6) · P6 คะแนนตนเอง · C-8 ยืนยันคำแปล + จำกัด 8,000 ตัวอักษร
 * - คง testid ตาม ADR 7.3 · ปุ่มที่ทำไม่ได้ไม่ render
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RATING_SCALE, TRANSLATE_MAX_CHARS, acceptAiRun, addComment, approveSection, can, citableCodes, confirmTranslationReviewed,
  cycleScope, getGaps, linkEvidence, listMyTodos, programmeScope, resolveComment, restoreVersion, returnSection,
  runSarDrafter, runSarReviewer, runTranslate, saveSection, setSelfRating, submitSection, touchSession, unlinkEvidence,
  validateCitations, AunqaError, listSections,
} from '@/lib/api';
import type {
  AiRun, AppUser, AssessmentCycle, Comment, Rating, Requirement, ReviewEvent, SarSection, SarSectionVersion,
} from '@/lib/types';
import type { EvidenceView } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { useAuth } from '@/context/AuthContext';
import { AsyncButton, Badge, Empty, InlineMessage, ModelBadge } from './common';
import RequirementCard from './RequirementCard';
import TranslateResult from './TranslateResult';
import Icon from '@/components/ui/Icon';
import Stepper, { type StepItem } from '@/components/ui/Stepper';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Textarea } from '@/components/ui/primitives/textarea';
import { cn } from '@/lib/ui/cn';
import { PDCA_TH, SECTION_STATUS_TH, errMsg, fmtDateTime, sectionHref, truncateTh } from '@/lib/ui/aunqa';
import { registerFlush } from '@/lib/ui/flush';
// นับคำแบบเดียวกับ gap R4 / wordCount ของ section (ไทยใช้ Intl.Segmenter) — pure function อ่านอย่างเดียว
import { countWords } from '@/lib/utils/text';
import { notifyTodosChanged } from '@/lib/ui/todo';

type Lang = 'th' | 'en';
type SideTab = 'evidence' | 'comments' | 'history';
const WRITABLE_CYCLE = ['draft', 'in_progress', 'revision_requested'];
const EDITABLE_SECTION = ['not_started', 'drafting', 'changes_requested'];

export interface WorkspaceData {
  cycle: AssessmentCycle;
  section: SarSection;
  req: Requirement;
  linked: EvidenceView[];
  linkable: EvidenceView[];
  versions: SarSectionVersion[];
  ratings: Rating[];
  comments: Comment[];
  names: Record<string, string>;
  aiEnabled: boolean;
  /** ประวัติการตรวจของข้อนี้ (ส่งตรวจ/อนุมัติ/ส่งกลับ) เรียงเก่า → ใหม่ — UX-U3-1 */
  reviewEvents?: ReviewEvent[];
}

/** เหตุผลของ conflict ตามจริง (เทียบฉบับล่าสุดกับสิ่งที่หน้านี้รู้) — U3P-2 */
function conflictReason(base: SarSection, saved: { th: string; en: string; pdca: SarSection['pdca'] }, cur: SarSection, names: Record<string, string>): string {
  const who = cur.updatedBy ? names[cur.updatedBy] : '';
  const by = who ? ` (โดย ${who})` : '';
  if (cur.narrativeTh !== saved.th || cur.narrativeEn !== saved.en || JSON.stringify(cur.pdca) !== JSON.stringify(saved.pdca))
    return `เนื้อหาของข้อนี้ถูกแก้จากที่อื่น${by} หลังจากที่คุณเปิดหน้า (อาจเป็นแท็บหรือเครื่องอื่น)`;
  if (cur.status !== base.status) return `สถานะของข้อนี้เปลี่ยนเป็น “${SECTION_STATUS_TH[cur.status]}”${by}`;
  if (cur.ownerUserId !== base.ownerUserId || cur.due !== base.due) return `ผู้รับผิดชอบหรือกำหนดส่งของข้อนี้ถูกเปลี่ยน${by}`;
  if (JSON.stringify(cur.needsTranslationReview ?? {}) !== JSON.stringify(base.needsTranslationReview ?? {})) return `มีการยืนยันคำแปลของข้อนี้จากที่อื่น${by}`;
  return `ข้อนี้ถูกบันทึกจากที่อื่น${by} หลังจากที่คุณเปิดหน้า`;
}

type SaveState = { kind: 'idle' | 'dirty' | 'saved' | 'error'; at?: number; msg?: string };

// ─── หน้าตา (saas-spec §P9, §C2, §C11 + friendly-spec §F13 — earth) ───
const CARD = 'rounded-xl border bg-card p-5 text-card-foreground shadow-sm dark:shadow-none md:p-6';
const H2 = 'm-0 text-lg font-semibold text-foreground';
const LIST = 'm-0 list-none divide-y p-0';
const CHECK_ROW = 'flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground';
const CHECK_INPUT = 'h-5 w-5 shrink-0 accent-primary';
/** C11 แบบ segmented (แผงข้าง / ตัวเลือกเล็ก) — ใช้ได้ทั้ง role=tab (aria-selected) และ role=radio (aria-checked) */
const SEG_LIST = 'flex flex-wrap gap-1 rounded-lg bg-muted p-1';
const SEG_ITEM = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-base font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground '
  + 'aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-sm aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-sm';
/** C11 แบบเส้นใต้ (TH/EN ใน editor) */
const LINE_TAB = '-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-base font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground aria-selected:border-primary aria-selected:text-foreground';
/** กล่องผล AI (ร่าง/ตรวจ/แปล) */
const AI_BOX = 'mt-4 space-y-4 rounded-xl border bg-muted/40 p-4 animate-fade-in md:p-5';
const DRAFT_BOX = 'max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-card p-4 text-base leading-relaxed text-foreground';

/**
 * ปลายทาง deep link ของแจ้งเตือนความเห็น (friendly-spec §F3.3): URL `…#comments` → เปิดแท็บข้าง "ความเห็น"
 * จำ href ที่จัดการแล้วระดับโมดูล — SarWorkspace ถูก remount หลังบันทึก/ส่งตรวจ (key rev) ไม่ให้ดึงแท็บกลับซ้ำทุกครั้ง
 * หน้า section เรียก `resetCommentsDeepLink()` ตอน unmount (ออกจากหน้า) → กดแจ้งเตือนเดิมซ้ำภายหลังก็เปิดแท็บอีกครั้ง
 */
let commentsHashHandledFor = '';
export function resetCommentsDeepLink(): void { commentsHashHandledFor = ''; }


export default function SarWorkspace({ data, user, reload, remount }: {
  data: WorkspaceData; user: AppUser; reload: () => void; remount: () => void;
}) {
  const { cycle, section, req, linked, linkable, versions, ratings, comments, names, aiEnabled } = data;
  const { showToast } = useToast();
  const { confirm, choose, prompt } = useDialog();
  const reviewEvents = data.reviewEvents ?? [];
  const lastReturn = [...reviewEvents].reverse().find(e => e.toStatus === 'changes_requested');
  const { sessionLost } = useAuth();
  const router = useRouter();

  const scope = cycleScope(cycle, { ownerUserId: section.ownerUserId });
  const cycleWritable = !cycle.lockedAt && WRITABLE_CYCLE.includes(cycle.status);
  const sectionEditable = EDITABLE_SECTION.includes(section.status);
  const canWrite = can(user, 'sar.write', scope);
  const editable = canWrite && cycleWritable && sectionEditable && !sessionLost;
  const canEvidenceWrite = can(user, 'evidence.write', programmeScope(cycle.programmeId)) && cycleWritable && !sessionLost;
  const canAi = can(user, 'ai.use', scope) && aiEnabled && !sessionLost;

  // ─── editor state ───
  const [lang, setLang] = useState<Lang>('th');
  const [th, setTh] = useState(section.narrativeTh);
  const [en, setEn] = useState(section.narrativeEn);
  const [pdca, setPdca] = useState(section.pdca);
  const [touched, setTouched] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const thRef = useRef<HTMLTextAreaElement>(null);
  const enRef = useRef<HTMLTextAreaElement>(null);
  // U3P-2: updatedAt ที่หน้านี้ถือ (ตอนเปิด / หลังบันทึกเองสำเร็จ) + เนื้อหาที่บันทึกล่าสุด
  const baseRef = useRef(section.updatedAt);
  const savedRef = useRef({ th: section.narrativeTh, en: section.narrativeEn, pdca: section.pdca });
  const [conflict, setConflict] = useState<{ reason: string } | null>(null);
  const conflictRef = useRef(false);

  const save = useCallback((reason: 'autosave' | 'manual'): { ok: boolean; error?: string } => {
    if (conflictRef.current) return { ok: false, error: 'ข้อนี้ถูกแก้จากที่อื่น — โหลดฉบับล่าสุดก่อน' };
    try {
      const nextPdca = { plan: pdca.plan, do: pdca.do, check: pdca.check, act: pdca.act };
      const saved = saveSection(user, cycle.id, req.id, {
        narrativeTh: th, narrativeEn: en, pdca: nextPdca,
      }, reason, { baseUpdatedAt: baseRef.current });
      baseRef.current = saved.updatedAt;
      savedRef.current = { th: saved.narrativeTh, en: saved.narrativeEn, pdca: saved.pdca };
      setTouched(false);
      setSaveState({ kind: 'saved', at: Date.now() });
      if (reason === 'manual') { showToast('บันทึกแล้ว', 'success'); reload(); }
      return { ok: true };
    } catch (e) {
      if (e instanceof AunqaError && e.code === 'conflict') {
        const cur = (e.detail?.current ?? null) as SarSection | null;
        const why = cur ? conflictReason(section, savedRef.current, cur, names) : e.message;
        conflictRef.current = true;
        setConflict({ reason: why });
        const msg = 'ข้อนี้ถูกแก้จากที่อื่น ข้อความล่าสุดของคุณยังไม่ถูกบันทึก';
        setSaveState({ kind: 'error', msg });
        return { ok: false, error: msg };
      }
      const msg = errMsg(e);
      setSaveState({ kind: 'error', msg });
      if (reason === 'manual') showToast(msg, 'error');
      return { ok: false, error: msg };
    }
  }, [user, cycle.id, req.id, th, en, pdca, showToast, reload, section, names]);

  // ค่าล่าสุดสำหรับ handler ภายนอก (flush / visibility / beforeunload)
  const { user: authUser } = useAuth();
  const live = useRef({ touched, editable, save, lang, th, en, active: true });
  live.current = { touched, editable, save, lang, th, en, active: !!authUser && !sessionLost };

  function edited() {
    setTouched(true);
    setSaveState({ kind: 'dirty' });
    touchSession();
  }

  // autosave: หยุดพิมพ์ 1.5 วิ
  useEffect(() => {
    if (!editable || !touched || conflict) return;
    const t = setTimeout(() => save('autosave'), 1500);
    return () => clearTimeout(t);
  }, [th, en, pdca, touched, editable, save, conflict]);

  // U3P-2: แจ้ง conflict ครั้งเดียว — โหลดฉบับล่าสุด หรือคัดลอกข้อความของฉันก่อน (ไม่ทับงานคนอื่นเงียบ ๆ)
  const myText = () => [th && `[ภาษาไทย]\n${th}`, en && `[English]\n${en}`].filter(Boolean).join('\n\n');
  async function copyMine() {
    try { await navigator.clipboard.writeText(myText()); showToast('คัดลอกข้อความของคุณแล้ว', 'success'); }
    catch { showToast('คัดลอกไม่สำเร็จ — เลือกข้อความในกล่องแล้วคัดลอกเอง', 'error'); }
  }
  const askedConflict = useRef(false);
  useEffect(() => {
    if (!conflict || askedConflict.current) return;
    askedConflict.current = true;
    // U2-1: ถูกระบบปิด (logout / session หาย) = ไม่ทำอะไร — ห้ามคัดลอกลง clipboard เอง
    choose({
      title: 'ข้อนี้ถูกแก้จากที่อื่น',
      message: `${conflict.reason} — ระบบยังไม่บันทึกข้อความล่าสุดของคุณ เพื่อไม่ให้ทับงานที่อื่น`,
      variant: 'warning',
      confirmText: 'ยืนยันโหลดฉบับล่าสุด',
      cancelText: 'คัดลอกข้อความของฉันก่อน',
      initialFocus: 'cancel',
    }).then(r => {
      if (r === 'dismissed' || !live.current.active) return;
      if (r === 'confirm') remount(); else void copyMine();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflict]);

  // flush (ADR 6.4) + visibilitychange + beforeunload (P3)
  useEffect(() => {
    const unregister = registerFlush(() => {
      const s = live.current;
      if (!s.touched || !s.editable) return null;
      const r = s.save('autosave');
      return { ok: r.ok, label: `ข้อ ${req.id}`, error: r.error, text: s.lang === 'th' ? s.th : s.en };
    });
    const onVis = () => { if (document.visibilityState === 'hidden' && live.current.touched && live.current.editable) live.current.save('autosave'); };
    const onUnload = (e: BeforeUnloadEvent) => {
      const s = live.current;
      if (!s.touched || !s.editable) return;
      if (!s.save('autosave').ok) { e.preventDefault(); e.returnValue = ''; }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onUnload);
    return () => { unregister(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('beforeunload', onUnload); };
  }, [req.id]);

  // ความสูงของ sticky action bar → toast หลบ (C14/C23)
  useEffect(() => {
    document.documentElement.style.setProperty('--actionbar-h', '72px');
    return () => { document.documentElement.style.removeProperty('--actionbar-h'); };
  }, []);

  function switchLang(next: Lang) {
    if (next === lang) return;
    if (live.current.touched && editable) save('autosave');
    setLang(next);
  }

  const citations = useMemo(() => validateCitations(cycle.id, `${th}\n${en}`), [cycle.id, th, en, linked.length]);
  const citable = useMemo(() => (citations.invalid.length ? Array.from(citableCodes(cycle.id)).sort() : []), [cycle.id, citations.invalid.length]);
  const text = lang === 'th' ? th : en;
  const words = countWords(text);

  function insertCitation(code: string) {
    const ref = lang === 'th' ? thRef.current : enRef.current;
    const tag = `[${code}]`;
    const pos = ref ? ref.selectionStart : text.length;
    const next = `${text.slice(0, pos)}${tag}${text.slice(pos)}`;
    if (lang === 'th') setTh(next); else setEn(next);
    edited();
    setTimeout(() => { ref?.focus(); ref?.setSelectionRange(pos + tag.length, pos + tag.length); }, 0);
  }

  // ─── workflow ───
  const self = [...ratings].filter(r => r.requirementId === req.id && r.raterType === 'self').sort((a, b) => b.at - a.at)[0];

  async function doSubmit() {
    if (touched && !save('manual').ok) return;
    let gaps: ReturnType<typeof getGaps> = [];
    try { gaps = getGaps(user, cycle.id, req.id); } catch { /* ไม่มีสิทธิ์อ่าน gap */ }
    const g = (rule: string) => gaps.filter(x => x.ruleId === rule);
    type Item = { ok: boolean; text: string };
    const items: Item[] = [];
    const r4 = g('R4');
    items.push(r4.length ? { ok: false, text: r4[0].messageTh } : { ok: true, text: `มีเนื้อหา (${countWords(th)} คำ)` });
    items.push(linked.length ? { ok: true, text: `ผูกหลักฐานแล้ว ${linked.length} ชิ้น` } : { ok: false, text: 'ยังไม่ได้ผูกหลักฐาน' });
    const r9 = g('R9');
    items.push(r9.length ? { ok: false, text: r9[0].messageTh } : { ok: true, text: 'อ้างอิงหลักฐานในเนื้อหาครบ' });
    items.push(self ? { ok: true, text: `ให้คะแนนประเมินตนเองแล้ว (${self.score})` } : { ok: false, text: 'ยังไม่ได้ให้คะแนนประเมินตนเอง' });
    const r11 = g('R11');
    if (r11.length) items.push({ ok: false, text: `คำแปลได้รับการยืนยัน — ${r11[0].messageTh}` });
    gaps.filter(x => !['R4', 'R9', 'R11'].includes(x.ruleId) && (x.severity === 'critical' || x.severity === 'high'))
      .forEach(x => items.push({ ok: false, text: x.messageTh }));
    const warn = items.filter(i => !i.ok).length;
    const ok = await confirm({
      title: `ส่งข้อ ${req.id} ให้ประธานหลักสูตรตรวจ`,
      message: 'หลังส่งแล้วจะแก้ไขไม่ได้จนกว่าจะถูกส่งกลับ',
      details: (
        <ul className="m-0 list-none space-y-2 p-0">{items.map((i, n) => (
          <li key={n} className="flex items-start gap-2 text-base text-foreground">
            <Icon name={i.ok ? 'check-circle' : 'alert-triangle'} size={20} className={cn('mt-0.5', i.ok ? 'text-success' : 'text-warning')} />{i.text}
          </li>
        ))}</ul>
      ),
      variant: warn ? 'warning' : 'primary',
      confirmText: warn ? `ยืนยันส่งตรวจ (ยังมี ${warn} จุดที่ควรเติม)` : 'ยืนยันส่งตรวจ',
      cancelText: 'กลับไปเติมก่อน',
      initialFocus: warn ? 'cancel' : 'confirm',
    });
    if (!ok) return;
    try {
      submitSection(user, cycle.id, req.id);
      notifyTodosChanged();
      let next: string | null = null;
      try {
        const t = listMyTodos(user).find(x => ['fix_section', 'write_section', 'translation_review'].includes(x.kind)
          && x.cycleId && x.requirementIds?.[0] && !(x.cycleId === cycle.id && x.requirementIds[0] === req.id));
        if (t) next = sectionHref(t.cycleId!, t.requirementIds![0]);
      } catch { /* ไม่มีงานถัดไป */ }
      showToast(`ส่งตรวจข้อ ${req.id} แล้ว — ประธานหลักสูตรได้รับแจ้งเตือน`, 'success',
        next ? { action: { label: 'ไปข้อถัดไปของฉัน →', onClick: () => router.push(next!) } } : undefined);
      remount();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  /** ข้อถัดไปในคิวรอตรวจของรอบนี้ (UX-U3-4) */
  function nextInQueue(): string | null {
    try {
      const next = listSections(user, cycle.id).filter(s => s.status === 'ready_for_review' && s.requirementId !== req.id)
        .sort((a, b) => a.updatedAt - b.updatedAt)[0];
      return next ? sectionHref(cycle.id, next.requirementId) : null;
    } catch { return null; }
  }
  function toastWithNext(msg: string) {
    const next = nextInQueue();
    showToast(msg, 'success', next
      ? { action: { label: 'เปิดข้อถัดไปในคิว →', onClick: () => router.push(next) } }
      : { action: { label: 'กลับคิวรอตรวจ', onClick: () => router.push('/app/review') } });
  }
  async function doApprove() {
    try { approveSection(user, cycle.id, req.id); toastWithNext(`อนุมัติข้อ ${req.id} แล้ว`); notifyTodosChanged(); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function doReturn() {
    const note = await prompt({
      title: `ส่งข้อ ${req.id} กลับแก้ไข`, message: 'ระบุสิ่งที่ต้องแก้ (เจ้าของข้อจะได้รับแจ้งเตือน)', required: true,
      variant: 'warning', confirmText: 'ยืนยันส่งกลับแก้ไข',
    });
    if (note === null) return;
    try { returnSection(user, cycle.id, req.id, note); toastWithNext(`ส่งข้อ ${req.id} กลับแก้ไขแล้ว`); notifyTodosChanged(); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function doRestore(v: SarSectionVersion) {
    const ok = await confirm({
      title: 'กู้คืนเวอร์ชัน', message: `กู้คืนเนื้อหาเมื่อ ${fmtDateTime(v.savedAt)}? เนื้อหาปัจจุบันจะถูกเก็บเป็นเวอร์ชันไว้ก่อน`,
      variant: 'warning', confirmText: 'ยืนยันกู้คืน',
    });
    if (!ok) return;
    try { restoreVersion(user, v.id); showToast('กู้คืนแล้ว', 'success'); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  const approverRole = section.status === 'ready_for_review' && can(user, 'sar.approve', scope) && !sessionLost;
  const selfAuthored = approverRole && !!section.lastAuthorId && section.lastAuthorId === user.id;
  const canApprove = approverRole && !selfAuthored;
  const canReturn = (section.status === 'ready_for_review' || section.status === 'approved') && can(user, 'sar.return', scope) && !sessionLost;
  const canSubmit = editable && (section.status === 'drafting' || section.status === 'changes_requested' || section.status === 'not_started');

  // ─── evidence link ───
  const [linkId, setLinkId] = useState('');
  const [linkQ, setLinkQ] = useState('');
  const linkOptions = linkable.filter(e => !linkQ.trim() || `${e.code} ${e.title}`.toLowerCase().includes(linkQ.trim().toLowerCase()));
  function doLink() {
    if (!linkId) return;
    try { linkEvidence(user, linkId, cycle.id, [req.id]); setLinkId(''); setLinkQ(''); showToast('ผูกหลักฐานแล้ว', 'success'); reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  function doUnlink(id: string) {
    try { unlinkEvidence(user, id, cycle.id, req.id); showToast('เลิกผูกแล้ว', 'success'); reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  // ─── AI ───
  const [run, setRun] = useState<AiRun | null>(null);
  const [aiMode, setAiMode] = useState<'append' | 'replace'>('append');
  const tooLong = text.length > TRANSLATE_MAX_CHARS;
  async function doAi(kind: 'draft' | 'review') {
    if (touched) save('autosave');
    try {
      const r = kind === 'draft' ? await runSarDrafter(user, cycle.id, req.id, lang) : await runSarReviewer(user, cycle.id, req.id, lang);
      setRun(r);
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function doTranslate() {
    if (tooLong) return;
    if (touched && !save('autosave').ok) return;
    try { setRun(await runTranslate(user, section.id, lang === 'th' ? 'en' : 'th')); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  function doAccept() {
    if (!run) return;
    if (touched && !save('autosave').ok) return;
    try {
      acceptAiRun(user, run.id, { mode: aiMode });
      showToast(run.feature === 'AI-2' ? 'ใส่ร่างเข้าเอกสารแล้ว' : run.feature === 'AI-4' ? 'ใส่คำแปลเข้าเอกสารแล้ว (ดูที่แท็บภาษาปลายทาง)' : 'รับทราบคำแนะนำแล้ว', 'success');
      setRun(null);
      remount();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  function doConfirmTranslation(l: Lang) {
    try { confirmTranslationReviewed(user, cycle.id, req.id, l); showToast('ยืนยันคำแปลแล้ว', 'success'); notifyTodosChanged(); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  // ─── comments / side tabs ───
  const [cBody, setCBody] = useState('');
  function doComment() {
    try { addComment(user, cycle.id, req.id, cBody); setCBody(''); reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }
  const unresolved = comments.filter(c => !c.resolvedAt).length;
  const [side, setSide] = useState<SideTab>('evidence');
  // §F3.3: hash #comments → แท็บ "ความเห็น" (ตอนเปิดหน้า + hashchange) แล้วเลื่อนแผงให้เห็น (ไม่ย้าย focus)
  useEffect(() => {
    function openComments(force: boolean) {
      if (window.location.hash !== '#comments') return;
      if (!force && commentsHashHandledFor === window.location.href) return;
      commentsHashHandledFor = window.location.href;
      setSide('comments');
      requestAnimationFrame(() => document.getElementById('sidepanel-comments')?.scrollIntoView({ block: 'nearest' }));
    }
    openComments(false);
    const onHash = () => openComments(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const sideTabs: { k: SideTab; label: string; n: number }[] = [
    { k: 'evidence', label: 'หลักฐาน', n: linked.length },
    { k: 'comments', label: 'ความเห็น', n: unresolved },
    { k: 'history', label: 'ประวัติ', n: versions.length + reviewEvents.length },
  ];
  const sideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  function onSideKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = sideTabs.findIndex(t => t.k === side);
    const n = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1;
    if (n < 0) return;
    e.preventDefault(); setSide(sideTabs[n].k); sideRefs.current[n]?.focus();
  }

  // ─── stepper ───
  const r4Open = useMemo(() => { try { return getGaps(user, cycle.id, req.id).some(g => g.ruleId === 'R4'); } catch { return false; } },
    [user, cycle.id, req.id, section.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = {
    evidence: linked.length > 0,
    write: !r4Open,
    rating: !!self && (pdca.plan || pdca.do || pdca.check || pdca.act),
    submit: section.status === 'ready_for_review' || section.status === 'approved',
  };
  const order: (keyof typeof done)[] = ['evidence', 'write', 'rating', 'submit'];
  const firstOpen = order.find(k => !done[k]);
  const steps: StepItem[] = [
    { key: 'evidence', label: 'หลักฐาน', meta: `ผูกแล้ว ${linked.length} ชิ้น`, href: '#step-evidence', onSelect: () => setSide('evidence') },
    { key: 'write', label: 'เขียนเนื้อหา', meta: `${countWords(th)} คำ`, href: '#step-write' },
    { key: 'rating', label: 'PDCA และคะแนนตนเอง', meta: self ? `คะแนนตนเอง ${self.score}` : 'ยังไม่ให้คะแนน', href: '#step-rating' },
    { key: 'submit', label: 'ส่งตรวจ', meta: cycle.lockedAt ? 'ล็อกแล้ว' : SECTION_STATUS_TH[section.status], href: '#section-actionbar' },
  ].map(s => ({ ...s, state: done[s.key as keyof typeof done] ? 'done' : s.key === firstOpen ? 'current' : 'todo' }) as StepItem);

  const readonlyText = cycle.lockedAt ? 'รอบถูกล็อกแล้ว แก้ไขไม่ได้'
    : !cycleWritable ? 'รอบอยู่ในสถานะที่แก้ไขเนื้อหาไม่ได้'
      : !sectionEditable ? 'ข้อนี้อยู่ระหว่างตรวจหรืออนุมัติแล้ว แก้ไขไม่ได้'
        : sessionLost ? 'ออกจากระบบแล้ว — หน้านี้เป็นแบบอ่านอย่างเดียวจนกว่าจะเข้าสู่ระบบใหม่'
          : 'คุณไม่มีสิทธิ์แก้ไขข้อนี้ (ดูอย่างเดียว)';
  const needsReview = section.needsTranslationReview?.[lang];
  const allStepsDone = steps.every(s => s.state === 'done');
  const stepSummary = cycle.lockedAt ? (allStepsDone ? `ล็อกแล้ว (ครบ ${steps.length} ขั้น)` : 'ล็อกแล้ว — แก้ไขไม่ได้')
    : section.status === 'approved' ? `อนุมัติแล้ว (ครบ ${steps.length} ขั้น)`
      : section.status === 'ready_for_review' ? 'ส่งตรวจแล้ว — รอประธานหลักสูตรตรวจ' : undefined;

  return (
    <div data-testid="sar-editor" className="space-y-4">
      {lastReturn && section.status === 'changes_requested' && (
        <InlineMessage tone="warn" icon="undo" testId="return-reason"
          title={`${names[lastReturn.actorId] || 'ประธานหลักสูตร'} ส่งกลับแก้ไขเมื่อ ${fmtDateTime(lastReturn.at)}`}>
          {lastReturn.note?.trim() ? `“${lastReturn.note.trim()}”` : 'ไม่ได้ระบุเหตุผล'}
        </InlineMessage>
      )}
      {conflict && (
        <InlineMessage tone="danger" testId="save-conflict" title="ข้อนี้ถูกแก้จากที่อื่น — ข้อความล่าสุดของคุณยังไม่ถูกบันทึก"
          actions={<>
            <Button variant="outline" onClick={() => void copyMine()}>คัดลอกข้อความของฉัน</Button>
            <Button onClick={remount} data-testid="conflict-reload">โหลดฉบับล่าสุด</Button>
          </>}>
          {conflict.reason}
        </InlineMessage>
      )}
      <div className={cn(CARD, 'py-4 md:py-5')}>
        <Stepper ariaLabel="ขั้นตอนของข้อนี้" steps={steps} summary={stepSummary} />
      </div>
      {!editable && <InlineMessage tone="info" icon={cycle.lockedAt ? 'lock' : 'info'} testId="readonly-reason">{readonlyText}</InlineMessage>}
      {selfAuthored && (
        <InlineMessage tone="warn" testId="segregation-note" title={<>คุณเป็นผู้เขียนเนื้อหาล่าสุดของข้อนี้ จึงอนุมัติเองไม่ได้ <Term k="segregation" label="การแยกหน้าที่" /></>}>
          ให้มอบหมายข้อนี้ให้ผู้อื่นปรับหรือส่งตรวจ แล้วคุณค่อยอนุมัติ หรือกด “ส่งกลับแก้ไข” หากต้องการให้แก้เพิ่ม
        </InlineMessage>
      )}

      <div className="grid items-start gap-6 pt-2 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* ── คอลัมน์หลัก ── */}
        <div className="min-w-0 space-y-6">
          <details className="group rounded-xl border bg-card shadow-sm dark:shadow-none">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-5 py-2.5 text-base text-foreground [&::-webkit-details-marker]:hidden">
              <Icon name="book-open" size={20} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1"><span className="font-medium">ข้อกำหนด:</span> <span className="text-muted-foreground">{truncateTh(req.textTh, 90)}</span></span>
              <Icon name="chevron-down" size={20} className="shrink-0 text-muted-foreground transition-transform duration-fast group-open:rotate-180" />
            </summary>
            <div className="border-t p-5 md:p-6">
              <RequirementCard req={req} embedded />
            </div>
          </details>

          <section className={CARD} id="step-write" aria-labelledby="write-h">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 id="write-h" className={H2}>เนื้อหา SAR</h2>
              <span className="aq-meta tabular-nums">{words} คำ</span>
            </div>
            <div className="mb-4 mt-2 flex flex-wrap gap-1 border-b" role="tablist" aria-label="ภาษา">
              <button type="button" role="tab" className={LINE_TAB} aria-selected={lang === 'th'} onClick={() => switchLang('th')} data-testid="tab-th">ภาษาไทย</button>
              <button type="button" role="tab" className={LINE_TAB} aria-selected={lang === 'en'} onClick={() => switchLang('en')} data-testid="tab-en">English</button>
            </div>

            {canAi && (
              <div className="mb-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {editable && (
                    <AsyncButton variant="outline" size="compact" testId="ai-draft" busyText="กำลังร่าง…" onClick={() => doAi('draft')}>
                      <Icon name="sparkle" size={20} />ร่างจากหลักฐาน
                    </AsyncButton>
                  )}
                  <AsyncButton variant="outline" size="compact" testId="ai-review" busyText="กำลังตรวจ…" onClick={() => doAi('review')}>
                    <Icon name="list-check" size={20} />ตรวจเนื้อหา
                  </AsyncButton>
                  {editable && (
                    <AsyncButton variant="outline" size="compact" testId="ai-translate" busyText="กำลังแปล…" disabled={tooLong} onClick={doTranslate}>
                      <Icon name="languages" size={20} />{lang === 'th' ? 'แปลเป็น EN' : 'แปลเป็น TH'}
                    </AsyncButton>
                  )}
                </div>
                {editable && tooLong && (
                  <p className="aq-btn-reason m-0" data-testid="translate-too-long">
                    เนื้อหายาว {text.length.toLocaleString('th-TH')} ตัวอักษร เกินที่แปลอัตโนมัติได้ครั้งละ {TRANSLATE_MAX_CHARS.toLocaleString('th-TH')} ตัวอักษร — แปลด้วยตนเอง หรือแบ่งเนื้อหาเป็นช่วงแล้วแปลทีละช่วงโดยย้ายส่วนที่ยังไม่แปลออกชั่วคราว
                  </p>
                )}
              </div>
            )}

            {needsReview && (
              <InlineMessage tone="info" className="mb-4" testId={`translation-review-${lang}`} title="ข้อความส่วนนี้มาจากคำแปลอัตโนมัติแบบแทนศัพท์"
                actions={editable ? (
                  <Button variant="outline" data-testid={`translation-confirm-${lang}`} onClick={() => doConfirmTranslation(lang)}>
                    ยืนยันว่าตรวจคำแปลแล้ว
                  </Button>
                ) : undefined}>
                แปลประโยคที่เหลือให้ครบแล้วกดยืนยัน ระบบจะเลิกเตือน (กฎ R11)
              </InlineMessage>
            )}

            {/* narrative: สลับ TH/EN ด้วย attribute hidden เท่านั้น — ห้ามใส่ block/flex (saas-spec §C2, D7.2) */}
            <Textarea
              ref={thRef} className="aq-textarea--prose max-h-[70vh] min-h-[24rem] leading-[1.75] [field-sizing:content]" hidden={lang !== 'th'} value={th} readOnly={!editable}
              aria-label="เนื้อหา SAR ภาษาไทย" data-testid="narrative-th"
              placeholder="บรรยายตามเกณฑ์ข้อนี้ พร้อมอ้างอิงหลักฐานด้วยรหัส เช่น [E-1.1-01]"
              onChange={e => { setTh(e.target.value); edited(); }}
              onBlur={() => { if (live.current.touched && editable) save('autosave'); }}
            />
            <Textarea
              ref={enRef} className="aq-textarea--prose max-h-[70vh] min-h-[24rem] leading-[1.75] [field-sizing:content]" hidden={lang !== 'en'} value={en} readOnly={!editable}
              aria-label="SAR narrative (English)" data-testid="narrative-en" lang="en"
              placeholder="Describe how the programme meets this criterion; cite evidence like [E-1.1-01]"
              onChange={e => { setEn(e.target.value); edited(); }}
              onBlur={() => { if (live.current.touched && editable) save('autosave'); }}
            />

            {citations.invalid.length > 0 && (
              <InlineMessage tone="danger" className="mt-3" testId="citation-warn" title={`อ้างอิงหลักฐานที่ไม่มีอยู่ในรอบนี้: ${citations.invalid.map(c => `[${c}]`).join(' ')} — ระบบจะไม่บันทึกจนกว่าจะแก้`}>
                <p className="m-0">ลบหรือแก้รหัสที่ไม่มีอยู่ หรือผูกหลักฐานนั้นกับรอบนี้ก่อน</p>
                <p className="aq-meta m-0 mt-1">
                  รหัสที่อ้างได้ในรอบนี้: {citable.length ? citable.slice(0, 12).join(', ') : 'ยังไม่มี'}
                  {citable.length > 12 ? ` และอีก ${citable.length - 12}` : ''}
                </p>
              </InlineMessage>
            )}
            {citations.valid.length > 0 && <p className="aq-meta m-0 mt-2">อ้างอิงแล้ว: {citations.valid.map(c => `[${c}]`).join(' ')}</p>}

            {canAi && run && run.feature === 'AI-4' && (
              <TranslateResult run={run} source={(run.output as { from?: string }).from === 'en' ? en : th} mode={aiMode} setMode={setAiMode}
                onAccept={doAccept} onDiscard={() => setRun(null)} canAccept={editable} />
            )}
            {canAi && run && run.feature !== 'AI-4' && (
              <AiResult run={run} aiMode={aiMode} setAiMode={setAiMode} onAccept={doAccept} onDiscard={() => setRun(null)} canAccept={run.feature === 'AI-3' || editable} />
            )}
            {canAi && <p className="aq-help m-0 mt-3">AI เสนอเท่านั้น — ข้อมูลส่วนบุคคลถูกปกปิดก่อนส่ง และต้องกด “ยอมรับ” จึงเข้าเอกสาร (ไม่ให้คะแนนทางการ)</p>}
          </section>

          <div id="step-rating" className="space-y-6">
            <div className={CARD}>
              <fieldset className="m-0 min-w-0 border-0 p-0" disabled={!editable}>
                <legend className="mb-2 flex items-center p-0 text-lg font-semibold text-foreground">PDCA ที่ครอบคลุมในเนื้อหา <Term k="pdca" label="PDCA" /></legend>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  {([['plan', 'P', 'Plan — มีแผน/นโยบาย'], ['do', 'D', 'Do — ดำเนินการจริง'], ['check', 'C', 'Check — ติดตามตรวจสอบ'], ['act', 'A', 'Act — ปรับปรุงจากผล']] as const).map(([k, l, t]) => (
                    <label key={k} className={cn(CHECK_ROW, !editable && 'cursor-default')}>
                      <input type="checkbox" className={CHECK_INPUT} checked={pdca[k]} data-testid={`pdca-${l}`}
                        onChange={e => { setPdca(p => ({ ...p, [k]: e.target.checked })); edited(); }} /> {t}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <RatingPanel user={user} cycle={cycle} section={section} ratings={ratings} scope={scope}
              cycleWritable={cycleWritable && !sessionLost} sectionEditable={sectionEditable} reload={reload} />
          </div>

          {/* sticky action bar (saas-spec §P9) — ปุ่ม primary เดียว · ส่งกลับ (อันตราย) แยกซ้าย */}
          <div className="sticky bottom-0 z-sticky border-t bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80" id="section-actionbar">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SaveIndicator state={saveState} editable={editable} onRetry={() => save('manual')} />
              <div className="flex flex-wrap items-center gap-2">
                {editable && (
                  <Button variant="outline" onClick={() => save('manual')} data-testid="save-manual">บันทึกตอนนี้</Button>
                )}
                <div className="flex flex-wrap items-center gap-2" data-testid="section-actions">
                  {canSubmit && <AsyncButton testId="section-submit" busyText="กำลังส่งตรวจ…" onClick={doSubmit}>ส่งตรวจ<Icon name="chevron-right" size={20} /></AsyncButton>}
                  {canApprove && <AsyncButton testId="section-approve" busyText="กำลังอนุมัติ…" onClick={doApprove}><Icon name="check" size={20} />อนุมัติข้อนี้</AsyncButton>}
                  {canReturn && (
                    <span className="sm:order-first sm:mr-4">
                      <AsyncButton variant="destructiveOutline" testId="section-return" onClick={doReturn}><Icon name="undo" size={20} />ส่งกลับแก้ไข</AsyncButton>
                    </span>
                  )}
                  {!canSubmit && !canApprove && !canReturn && !editable && <span className="aq-meta">ไม่มีการดำเนินการที่ทำได้ในสถานะนี้</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── แผงข้าง (sticky ที่ ≥1280 · ต่ำกว่านั้นอยู่ใต้ editor) ── */}
        <aside
          className={cn(CARD, 'min-w-0 space-y-5 xl:sticky xl:top-[calc(var(--topbar-h)+1rem)] xl:max-h-[calc(100vh-var(--topbar-h)-2rem)] xl:overflow-y-auto')}
          aria-label="หลักฐาน ความเห็น และประวัติ"
        >
          <div className={SEG_LIST} role="tablist" aria-label="แผงข้าง" onKeyDown={onSideKey}>
            {sideTabs.map((t, i) => (
              <button key={t.k} ref={el => { sideRefs.current[i] = el; }} type="button" role="tab" id={`sidetab-${t.k}`}
                className={cn(SEG_ITEM, 'flex-1 px-2')}
                aria-selected={side === t.k} aria-controls={`sidepanel-${t.k}`} tabIndex={side === t.k ? 0 : -1}
                onClick={() => setSide(t.k)} data-testid={`sidetab-${t.k}`}>
                {t.label} <span className="aq-count bg-background text-foreground">{t.n}</span>
              </button>
            ))}
          </div>

          {side === 'evidence' && (
            <div id="sidepanel-evidence" role="tabpanel" aria-labelledby="sidetab-evidence" className="space-y-4">
              <h2 id="step-evidence" className={H2} tabIndex={-1}>{`หลักฐานที่ผูกกับข้อนี้ (${linked.length})`}</h2>
              {linked.length === 0 ? <Empty icon="link" title="ยังไม่มีหลักฐานที่ผูก" /> : (
                <ul className={LIST} data-testid="linked-evidence">
                  {linked.map(e => (
                    <li key={e.id} className="flex items-start gap-2 py-3 first:pt-0">
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="m-0 break-words text-base text-foreground">
                          <Link className="font-medium tabular-nums text-primary" href={`/app/evidence/${e.id}?cycle=${cycle.id}`}><strong>{e.code}</strong></Link>{' '}
                          <span>{e.title}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="neutral" icon={false}>{PDCA_TH[e.pdcaStage]}</Badge>
                          {e.containsPii && !e.piiResolved && <Badge tone="bad" title="พบข้อมูลส่วนบุคคลที่ยังไม่จัดการ">PII</Badge>}
                          {e.status === 'verified' && <Badge tone="ok">ตรวจแล้ว</Badge>}
                        </div>
                        {editable && (
                          <Button variant="outline" size="compact" onClick={() => insertCitation(e.code)} data-testid={`insert-${e.code}`}>แทรก [{e.code}]</Button>
                        )}
                      </div>
                      {canEvidenceWrite && (
                        <Button variant="ghost" size="icon" className="-mr-2 shrink-0 text-muted-foreground" aria-label={`เลิกผูก ${e.code}`} title={`เลิกผูก ${e.code}`} onClick={() => doUnlink(e.id)}>
                          <Icon name="x" size={20} />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canEvidenceWrite && linkable.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="m-0 text-base font-medium text-foreground">ผูกหลักฐานเพิ่ม</p>
                  <Input type="search" placeholder="ค้นหารหัสหรือชื่อหลักฐาน…" aria-label="ค้นหาหลักฐานที่จะผูก"
                    value={linkQ} onChange={e => setLinkQ(e.target.value)} data-testid="link-search" />
                  <NativeSelect value={linkId} onChange={e => setLinkId(e.target.value)} aria-label="เลือกหลักฐานที่จะผูก" data-testid="link-select">
                    <option value="">{`— เลือกหลักฐาน (${linkOptions.length}) —`}</option>
                    {linkOptions.map(e => <option key={e.id} value={e.id}>{e.code} · {e.title}</option>)}
                  </NativeSelect>
                  <Button variant="outline" className="w-full" disabled={!linkId} onClick={doLink} data-testid="link-btn"><Icon name="link" size={20} />ผูก</Button>
                </div>
              )}
              {canEvidenceWrite && (
                <Button asChild variant="ghost" className="w-full">
                  <Link href={`/app/evidence?new=1&cycle=${encodeURIComponent(cycle.id)}&req=${encodeURIComponent(req.id)}`}>
                    <Icon name="plus" size={20} />อัปโหลดหลักฐานใหม่สำหรับข้อนี้
                  </Link>
                </Button>
              )}
            </div>
          )}

          {side === 'comments' && (
            <div id="sidepanel-comments" role="tabpanel" aria-labelledby="sidetab-comments" className="scroll-mt-[calc(var(--topbar-h)+1rem)] space-y-4">
              <h2 className={H2}>{`ความเห็น (${unresolved} ค้าง)`}</h2>
              {comments.length === 0 ? <Empty icon="inbox-check" title="ยังไม่มีความเห็น" /> : (
                <ul className={LIST} data-testid="comments">
                  {comments.map(c => (
                    <li key={c.id} className={cn('flex items-start gap-3 py-3 first:pt-0', c.resolvedAt && 'text-muted-foreground')}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="m-0 flex flex-wrap items-baseline gap-x-2">
                          <strong className="font-semibold text-foreground">{names[c.authorId] || c.authorId}</strong>
                          <span className="aq-meta">{fmtDateTime(c.at)}</span>
                        </p>
                        <p className="m-0 whitespace-pre-wrap break-words text-base">{c.body}</p>
                      </div>
                      {!c.resolvedAt && can(user, 'comment', scope) && (
                        <Button variant="outline" size="compact" className="shrink-0" onClick={() => { try { resolveComment(user, c.id); reload(); } catch (e) { showToast(errMsg(e), 'error'); } }}>แก้แล้ว</Button>
                      )}
                      {c.resolvedAt && <span className="shrink-0"><Badge tone="ok">แก้แล้ว</Badge></span>}
                    </li>
                  ))}
                </ul>
              )}
              {can(user, 'comment', scope) && !sessionLost && (
                <div className="space-y-1.5 border-t pt-4">
                  <label htmlFor="comment-body" className="text-base font-medium text-foreground">ความเห็นใหม่</label>
                  <Textarea id="comment-body" rows={3} value={cBody} onChange={e => setCBody(e.target.value)} data-testid="comment-body" />
                  <div className="pt-1">
                    <Button variant="outline" disabled={!cBody.trim()} onClick={doComment} data-testid="comment-add"><Icon name="message" size={20} />ส่งความเห็น</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {side === 'history' && (
            <div id="sidepanel-history" role="tabpanel" aria-labelledby="sidetab-history" className="space-y-4" data-testid="versions">
              {reviewEvents.length > 0 && (
                <div className="space-y-2">
                  <h2 className={H2}>{`ประวัติการตรวจ (${reviewEvents.length})`}</h2>
                  <ul className={LIST} data-testid="review-history">
                    {[...reviewEvents].reverse().map(ev => (
                      <li key={ev.id} className="space-y-1 py-3 first:pt-0">
                        <p className="m-0 flex flex-wrap items-center gap-2 text-base text-foreground">
                          <span className="tabular-nums">{fmtDateTime(ev.at)}</span>{' '}
                          <Badge icon={false} tone={ev.toStatus === 'changes_requested' ? 'warn' : ev.toStatus === 'approved' ? 'ok' : 'neutral'}>
                            {SECTION_STATUS_TH[ev.toStatus as SarSection['status']] ?? ev.toStatus}
                          </Badge>
                        </p>
                        <div className="aq-meta">{names[ev.actorId] || ev.actorId}</div>
                        {ev.note?.trim() && <p className="m-0 rounded-lg bg-muted px-3 py-2 text-base text-foreground">{`“${ev.note.trim()}”`}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <h2 className={H2}>{`ประวัติเวอร์ชัน (${versions.length})`}</h2>
                {versions.length === 0 ? <Empty icon="clock" title="ยังไม่มีเวอร์ชันที่บันทึก" /> : (
                  <ul className={LIST}>
                    {versions.map(v => (
                      <li key={v.id} className="flex items-center gap-3 py-3 first:pt-0">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="m-0 flex flex-wrap items-center gap-2 text-base text-foreground">
                            <span className="tabular-nums">{fmtDateTime(v.savedAt)}</span>{' '}
                            <Badge icon={false}>{v.reason === 'autosave' ? 'อัตโนมัติ' : v.reason === 'manual' ? 'บันทึกเอง' : v.reason === 'ai_accept' ? 'จาก AI' : 'ส่งตรวจ'}</Badge>
                          </p>
                          <div className="aq-meta">{names[v.savedBy] || v.savedBy}</div>
                        </div>
                        {editable && <Button variant="outline" size="compact" className="shrink-0" onClick={() => doRestore(v)}>กู้คืน</Button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────── C24 Save indicator ───────────────────────────

const SAVED = 'aq-saved inline-flex flex-wrap items-center gap-2';

function SaveIndicator({ state, editable, onRetry }: { state: SaveState; editable: boolean; onRetry: () => void }) {
  if (!editable) return <span className={SAVED} role="status" data-testid="save-status"><Icon name="eye" size={16} />อ่านอย่างเดียว</span>;
  if (state.kind === 'dirty') return <span className={cn(SAVED, 'text-warning')} role="status" data-testid="save-status"><Icon name="clock" size={16} />ยังไม่บันทึก — กำลังพิมพ์…</span>;
  if (state.kind === 'saved') {
    const t = new Date(state.at!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return <span className={cn(SAVED, 'animate-fade-in text-success')} role="status" data-testid="save-status"><Icon name="check-circle" size={16} />บันทึกแล้ว {t}</span>;
  }
  if (state.kind === 'error') {
    return (
      <span className={cn(SAVED, 'font-semibold text-destructive')} role="status" data-testid="save-status">
        <Icon name="x-circle" size={16} />ยังไม่ได้บันทึก: {state.msg}
        <Button variant="ghost" size="compact" onClick={onRetry}>ลองบันทึกอีกครั้ง</Button>
      </span>
    );
  }
  return <span className={SAVED} role="status" data-testid="save-status"><Icon name="pencil" size={16} />พร้อมแก้ไข</span>;
}

// ─────────────────────────── ผล AI ───────────────────────────

function AiResult({ run, aiMode, setAiMode, onAccept, onDiscard, canAccept }: {
  run: AiRun; aiMode: 'append' | 'replace'; setAiMode: (m: 'append' | 'replace') => void;
  onAccept: () => void; onDiscard: () => void; canAccept: boolean;
}) {
  const pc = run.postCheck;
  const out = run.output as { draft?: string; missing?: string[]; usedEvidence?: string[]; unanswered?: string[]; uncitedSentences?: string[]; suggestions?: string[] };
  const offline = run.model.startsWith('offline');
  const emptyDraft = run.feature === 'AI-2' && !out.draft?.trim();
  return (
    <div className={AI_BOX} data-testid="ai-result">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info" icon="sparkle">{run.feature === 'AI-2' ? 'ร่างเนื้อหา' : 'ตรวจเนื้อหา'}</Badge>
        <span className="inline-flex items-center"><ModelBadge run={run} />{offline && <Term k="offline" label="โหมดในเครื่อง" />}</span>
        <span className="inline-flex items-center"><Badge tone="neutral" icon={false}>ปกปิดข้อมูลส่วนบุคคล {run.redactionCount} จุด</Badge><Term k="redaction" label="การปกปิดข้อมูลส่วนบุคคล" /></span>
        {!emptyDraft && <Badge tone={pc.ok ? 'ok' : 'warn'} testId="postcheck">{pc.ok ? 'ผ่านการตรวจอ้างอิง/ตัวเลข' : 'พบข้อควรระวัง'}</Badge>}
      </div>
      {offline && run.feature === 'AI-2' && (
        <p className="aq-help m-0" data-testid="ai-offline-note">โหมดในเครื่องสร้างเป็นโครงร่างหัวข้อจากหลักฐานที่ผูก ไม่ใช่ร่างฉบับเต็ม — ใช้เป็นจุดเริ่มแล้วเขียนต่อเอง</p>
      )}
      {!pc.ok && !emptyDraft && (
        <ul className="m-0 list-disc space-y-1 rounded-lg border border-warning/30 bg-warning-muted py-3 pl-9 pr-4 text-base text-foreground">
          {pc.removedCitations.length > 0 && <li>ตัดการอ้างอิงที่ไม่มีจริงออกแล้ว: {pc.removedCitations.join(', ')}</li>}
          {pc.unknownNumbers.length > 0 && <li>ตัวเลขที่ไม่พบในข้อมูลต้นทาง (ตรวจสอบก่อนใช้): {pc.unknownNumbers.join(', ')}</li>}
          {pc.flaggedSentences.map((s, i) => <li key={i}>ประโยคที่ติดธง: {s}</li>)}
        </ul>
      )}
      {run.feature === 'AI-2' && (
        <>
          {emptyDraft
            ? <InlineMessage tone="info">ยังร่างไม่ได้เพราะยังไม่มีหลักฐานที่ผูก — ผูกหลักฐานในแท็บหลักฐานก่อน</InlineMessage>
            : <div className={DRAFT_BOX} data-testid="ai-draft-text">{out.draft}</div>}
          {out.missing && out.missing.length > 0 && (
            <div className="text-base text-foreground">
              <strong className="font-semibold">ยังขาด:</strong>
              <ul className="m-0 mt-1 list-disc space-y-1 pl-5">{out.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {!emptyDraft && (
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn(SEG_LIST, 'inline-flex')} role="radiogroup" aria-label="วิธีใส่ร่าง">
                <button type="button" role="radio" className={SEG_ITEM} aria-checked={aiMode === 'append'} onClick={() => setAiMode('append')}>ต่อท้ายข้อความเดิม</button>
                <button type="button" role="radio" className={SEG_ITEM} aria-checked={aiMode === 'replace'} onClick={() => setAiMode('replace')}>แทนที่ทั้งหมด</button>
              </div>
              <Term k="append_replace" label="ต่อท้าย / แทนที่" />
            </div>
          )}
        </>
      )}
      {run.feature === 'AI-3' && (
        <div className="space-y-3 text-base text-foreground" data-testid="ai-review-result">
          {([['ยังไม่ได้ตอบ', out.unanswered], ['ประโยคที่ไม่มีอ้างอิง', out.uncitedSentences], ['ข้อเสนอแนะ', out.suggestions]] as const).map(([t, list]) =>
            list && list.length > 0 ? (
              <div key={t}>
                <strong className="font-semibold">{t}</strong>
                <ul className="m-0 mt-1 list-disc space-y-1 pl-5">{list.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            ) : null)}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button onClick={onAccept} disabled={!canAccept || emptyDraft} data-testid="ai-accept">
          {run.feature === 'AI-2' ? 'ยอมรับและใส่ในเอกสาร' : 'รับทราบ'}
        </Button>
        <Button variant="ghost" onClick={onDiscard} data-testid="ai-discard">ทิ้ง</Button>
      </div>
    </div>
  );
}

// ─────────────────────────── self-rating / committee (P6) ───────────────────────────

function RatingPanel({ user, cycle, section, ratings, scope, cycleWritable, sectionEditable, reload }: {
  user: AppUser; cycle: AssessmentCycle; section: SarSection; ratings: Rating[];
  scope: ReturnType<typeof cycleScope>; cycleWritable: boolean; sectionEditable: boolean; reload: () => void;
}) {
  const { showToast } = useToast();
  const mine = (t: Rating['raterType']) => [...ratings].filter(r => r.requirementId === section.requirementId && r.raterType === t).sort((a, b) => b.at - a.at)[0];
  const self = mine('self');
  const committee = mine('committee');
  const mayRate = can(user, 'rating.self', scope) && cycleWritable;
  const canSelf = mayRate && sectionEditable;

  const [score, setScore] = useState(String(self?.score ?? ''));
  const [why, setWhy] = useState(self?.rationale ?? '');

  function saveSelf() {
    try {
      setSelfRating(user, cycle.id, section.requirementId, Number(score), why);
      showToast('บันทึกคะแนนประเมินตนเองแล้ว', 'success'); notifyTodosChanged(); reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  return (
    <section className={cn(CARD, 'space-y-4')} aria-labelledby="rate-h" data-testid="rating-panel">
      <h2 id="rate-h" className={cn(H2, 'flex items-center')}>คะแนนประเมินตนเอง (1–7) <Term k="self_rating" label="สเกล 1–7" /></h2>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="space-y-1.5 md:w-72">
          <label htmlFor="self-score" className="text-base font-medium text-foreground">คะแนน</label>
          <NativeSelect id="self-score" value={score} disabled={!canSelf}
            onChange={e => { setScore(e.target.value); touchSession(); }} data-testid="self-score">
            <option value="">— ยังไม่ให้คะแนน —</option>
            {RATING_SCALE.map(s => <option key={s.score} value={s.score}>{`${s.score} — ${s.nameTh}`}</option>)}
          </NativeSelect>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="self-why" className="text-base font-medium text-foreground">เหตุผลประกอบ</label>
          <Input id="self-why" value={why} disabled={!canSelf}
            onChange={e => { setWhy(e.target.value); touchSession(); }} data-testid="self-why" />
        </div>
        {canSelf && <Button variant="outline" className="shrink-0" disabled={!score} onClick={saveSelf} data-testid="self-save">บันทึกคะแนน</Button>}
      </div>
      {mayRate && !sectionEditable && <p className="aq-btn-reason m-0">ข้อนี้อยู่ระหว่างตรวจหรืออนุมัติแล้ว จึงแก้คะแนนไม่ได้</p>}
      {self && <p className="aq-meta m-0">ล่าสุด: {self.score} คะแนน ({fmtDateTime(self.at)})</p>}
      {committee && (
        <div className="space-y-1 border-t pt-4">
          <h3 className="m-0 text-base font-semibold text-foreground">คะแนนกรรมการประเมิน (รายข้อเดิม)</h3>
          <p className="m-0 text-base text-foreground">คะแนน {committee.score} — {committee.rationale || 'ไม่มีเหตุผล'}</p>
        </div>
      )}
    </section>
  );
}

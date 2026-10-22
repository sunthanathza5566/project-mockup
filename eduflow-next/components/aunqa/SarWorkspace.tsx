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
        <ul>{items.map((i, n) => (
          <li key={n} className={`aq-checkitem aq-checkitem--${i.ok ? 'ok' : 'warn'}`}>
            <Icon name={i.ok ? 'check-circle' : 'alert-triangle'} size={20} />{i.text}
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
    <div data-testid="sar-editor">
      {lastReturn && section.status === 'changes_requested' && (
        <InlineMessage tone="warn" icon="undo" testId="return-reason"
          title={`${names[lastReturn.actorId] || 'ประธานหลักสูตร'} ส่งกลับแก้ไขเมื่อ ${fmtDateTime(lastReturn.at)}`}>
          {lastReturn.note?.trim() ? `“${lastReturn.note.trim()}”` : 'ไม่ได้ระบุเหตุผล'}
        </InlineMessage>
      )}
      {conflict && (
        <InlineMessage tone="danger" testId="save-conflict" title="ข้อนี้ถูกแก้จากที่อื่น — ข้อความล่าสุดของคุณยังไม่ถูกบันทึก"
          actions={<>
            <button type="button" className="aq-btn" onClick={() => void copyMine()}>คัดลอกข้อความของฉัน</button>
            <button type="button" className="aq-btn aq-btn-primary" onClick={remount} data-testid="conflict-reload">โหลดฉบับล่าสุด</button>
          </>}>
          {conflict.reason}
        </InlineMessage>
      )}
      <Stepper ariaLabel="ขั้นตอนของข้อนี้" steps={steps} summary={stepSummary} />
      {!editable && <InlineMessage tone="info" icon={cycle.lockedAt ? 'lock' : 'info'} testId="readonly-reason">{readonlyText}</InlineMessage>}
      {selfAuthored && (
        <InlineMessage tone="warn" testId="segregation-note" title={<>คุณเป็นผู้เขียนเนื้อหาล่าสุดของข้อนี้ จึงอนุมัติเองไม่ได้ <Term k="segregation" label="การแยกหน้าที่" /></>}>
          ให้มอบหมายข้อนี้ให้ผู้อื่นปรับหรือส่งตรวจ แล้วคุณค่อยอนุมัติ หรือกด “ส่งกลับแก้ไข” หากต้องการให้แก้เพิ่ม
        </InlineMessage>
      )}

      <div className="aq-sar-layout">
        {/* ── คอลัมน์หลัก ── */}
        <div className="aq-sar-main">
          <details className="aq-card aq-collapse">
            <summary>
              <span className="aq-flex-1">ข้อกำหนด: <span className="aq-muted">{truncateTh(req.textTh, 90)}</span></span>
              <Icon name="chevron-down" size={20} className="aq-collapse__chev" />
            </summary>
            <RequirementCard req={req} embedded />
          </details>

          <section className="aq-card" id="step-write" aria-labelledby="write-h">
            <div className="aq-card__head">
              <h2 id="write-h" className="aq-h3">เนื้อหา SAR</h2>
              <div className="aq-seg" role="tablist" aria-label="ภาษา">
                <button type="button" role="tab" aria-selected={lang === 'th'} onClick={() => switchLang('th')} data-testid="tab-th">ภาษาไทย</button>
                <button type="button" role="tab" aria-selected={lang === 'en'} onClick={() => switchLang('en')} data-testid="tab-en">English</button>
              </div>
              <span className="aq-meta aq-tnum">{words} คำ</span>
            </div>

            {canAi && (
              <div className="aq-ai-toolbar">
                <div className="aq-cluster">
                  {editable && (
                    <AsyncButton className="aq-btn aq-btn-compact" testId="ai-draft" busyText="กำลังร่าง…" onClick={() => doAi('draft')}>
                      <Icon name="sparkle" size={20} />ร่างจากหลักฐาน
                    </AsyncButton>
                  )}
                  <AsyncButton className="aq-btn aq-btn-compact" testId="ai-review" busyText="กำลังตรวจ…" onClick={() => doAi('review')}>
                    <Icon name="list-check" size={20} />ตรวจเนื้อหา
                  </AsyncButton>
                  {editable && (
                    <AsyncButton className="aq-btn aq-btn-compact" testId="ai-translate" busyText="กำลังแปล…" disabled={tooLong} onClick={doTranslate}>
                      <Icon name="languages" size={20} />{lang === 'th' ? 'แปลเป็น EN' : 'แปลเป็น TH'}
                    </AsyncButton>
                  )}
                </div>
                {editable && tooLong && (
                  <p className="aq-btn-reason" data-testid="translate-too-long">
                    เนื้อหายาว {text.length.toLocaleString('th-TH')} ตัวอักษร เกินที่แปลอัตโนมัติได้ครั้งละ {TRANSLATE_MAX_CHARS.toLocaleString('th-TH')} ตัวอักษร — แปลด้วยตนเอง หรือแบ่งเนื้อหาเป็นช่วงแล้วแปลทีละช่วงโดยย้ายส่วนที่ยังไม่แปลออกชั่วคราว
                  </p>
                )}
              </div>
            )}

            {needsReview && (
              <InlineMessage tone="info" testId={`translation-review-${lang}`} title="ข้อความส่วนนี้มาจากคำแปลอัตโนมัติแบบแทนศัพท์"
                actions={editable ? (
                  <button type="button" className="aq-btn" data-testid={`translation-confirm-${lang}`} onClick={() => doConfirmTranslation(lang)}>
                    ยืนยันว่าตรวจคำแปลแล้ว
                  </button>
                ) : undefined}>
                แปลประโยคที่เหลือให้ครบแล้วกดยืนยัน ระบบจะเลิกเตือน (กฎ R11)
              </InlineMessage>
            )}

            <textarea
              ref={thRef} className="aq-textarea aq-textarea--prose" hidden={lang !== 'th'} value={th} readOnly={!editable}
              aria-label="เนื้อหา SAR ภาษาไทย" data-testid="narrative-th"
              placeholder="บรรยายตามเกณฑ์ข้อนี้ พร้อมอ้างอิงหลักฐานด้วยรหัส เช่น [E-1.1-01]"
              onChange={e => { setTh(e.target.value); edited(); }}
              onBlur={() => { if (live.current.touched && editable) save('autosave'); }}
            />
            <textarea
              ref={enRef} className="aq-textarea aq-textarea--prose" hidden={lang !== 'en'} value={en} readOnly={!editable}
              aria-label="SAR narrative (English)" data-testid="narrative-en" lang="en"
              placeholder="Describe how the programme meets this criterion; cite evidence like [E-1.1-01]"
              onChange={e => { setEn(e.target.value); edited(); }}
              onBlur={() => { if (live.current.touched && editable) save('autosave'); }}
            />

            {citations.invalid.length > 0 && (
              <InlineMessage tone="danger" testId="citation-warn" title={`อ้างอิงหลักฐานที่ไม่มีอยู่ในรอบนี้: ${citations.invalid.map(c => `[${c}]`).join(' ')} — ระบบจะไม่บันทึกจนกว่าจะแก้`}>
                <p>ลบหรือแก้รหัสที่ไม่มีอยู่ หรือผูกหลักฐานนั้นกับรอบนี้ก่อน</p>
                <p className="aq-muted">
                  รหัสที่อ้างได้ในรอบนี้: {citable.length ? citable.slice(0, 12).join(', ') : 'ยังไม่มี'}
                  {citable.length > 12 ? ` และอีก ${citable.length - 12}` : ''}
                </p>
              </InlineMessage>
            )}
            {citations.valid.length > 0 && <p className="aq-meta aq-mt-2">อ้างอิงแล้ว: {citations.valid.map(c => `[${c}]`).join(' ')}</p>}

            {canAi && run && run.feature === 'AI-4' && (
              <TranslateResult run={run} source={(run.output as { from?: string }).from === 'en' ? en : th} mode={aiMode} setMode={setAiMode}
                onAccept={doAccept} onDiscard={() => setRun(null)} canAccept={editable} />
            )}
            {canAi && run && run.feature !== 'AI-4' && (
              <AiResult run={run} aiMode={aiMode} setAiMode={setAiMode} onAccept={doAccept} onDiscard={() => setRun(null)} canAccept={run.feature === 'AI-3' || editable} />
            )}
            {canAi && <p className="aq-help aq-mt-2">AI เสนอเท่านั้น — ข้อมูลส่วนบุคคลถูกปกปิดก่อนส่ง และต้องกด “ยอมรับ” จึงเข้าเอกสาร (ไม่ให้คะแนนทางการ)</p>}
          </section>

          <div id="step-rating">
            <fieldset className="aq-card aq-pdca" disabled={!editable}>
              <legend className="aq-h3">PDCA ที่ครอบคลุมในเนื้อหา <Term k="pdca" label="PDCA" /></legend>
              {([['plan', 'P', 'Plan — มีแผน/นโยบาย'], ['do', 'D', 'Do — ดำเนินการจริง'], ['check', 'C', 'Check — ติดตามตรวจสอบ'], ['act', 'A', 'Act — ปรับปรุงจากผล']] as const).map(([k, l, t]) => (
                <label key={k} className="aq-check">
                  <input type="checkbox" checked={pdca[k]} data-testid={`pdca-${l}`}
                    onChange={e => { setPdca(p => ({ ...p, [k]: e.target.checked })); edited(); }} /> {t}
                </label>
              ))}
            </fieldset>
            <RatingPanel user={user} cycle={cycle} section={section} ratings={ratings} scope={scope}
              cycleWritable={cycleWritable && !sessionLost} sectionEditable={sectionEditable} reload={reload} />
          </div>

          {/* sticky action bar (C23) */}
          <div className="aq-actionbar" id="section-actionbar">
            <SaveIndicator state={saveState} editable={editable} onRetry={() => save('manual')} />
            <div className="aq-actionbar__actions">
              {editable && (
                <button type="button" className="aq-btn" onClick={() => save('manual')} data-testid="save-manual">บันทึกตอนนี้</button>
              )}
              <div className="aq-cluster" data-testid="section-actions">
                {canSubmit && <AsyncButton className="aq-btn aq-btn-primary" testId="section-submit" busyText="กำลังส่งตรวจ…" onClick={doSubmit}>ส่งตรวจ<Icon name="chevron-right" size={20} /></AsyncButton>}
                {canApprove && <AsyncButton className="aq-btn aq-btn-primary" testId="section-approve" busyText="กำลังอนุมัติ…" onClick={doApprove}><Icon name="check" size={20} />อนุมัติข้อนี้</AsyncButton>}
                {canReturn && <AsyncButton className="aq-btn aq-btn-danger aq-actionbar__danger" testId="section-return" onClick={doReturn}><Icon name="undo" size={20} />ส่งกลับแก้ไข</AsyncButton>}
                {!canSubmit && !canApprove && !canReturn && !editable && <span className="aq-meta">ไม่มีการดำเนินการที่ทำได้ในสถานะนี้</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── แผงข้าง ── */}
        <aside className="aq-sidepanel aq-card" aria-label="หลักฐาน ความเห็น และประวัติ">
          <div className="aq-tabs" role="tablist" aria-label="แผงข้าง" onKeyDown={onSideKey}>
            {sideTabs.map((t, i) => (
              <button key={t.k} ref={el => { sideRefs.current[i] = el; }} type="button" role="tab" id={`sidetab-${t.k}`}
                aria-selected={side === t.k} aria-controls={`sidepanel-${t.k}`} tabIndex={side === t.k ? 0 : -1}
                onClick={() => setSide(t.k)} data-testid={`sidetab-${t.k}`}>
                {t.label} <span className="aq-count aq-count--muted">{t.n}</span>
              </button>
            ))}
          </div>

          {side === 'evidence' && (
            <div id="sidepanel-evidence" role="tabpanel" aria-labelledby="sidetab-evidence" className="aq-tabpanel">
              <h2 id="step-evidence" className="aq-h3" tabIndex={-1}>{`หลักฐานที่ผูกกับข้อนี้ (${linked.length})`}</h2>
              {linked.length === 0 ? <Empty icon="link" title="ยังไม่มีหลักฐานที่ผูก" /> : (
                <ul className="aq-ev-list" data-testid="linked-evidence">
                  {linked.map(e => (
                    <li key={e.id}>
                      <div className="aq-flex-1">
                        <Link className="aq-link aq-code" href={`/app/evidence/${e.id}?cycle=${cycle.id}`}><strong>{e.code}</strong></Link>{' '}
                        <span>{e.title}</span>
                        <div className="aq-cluster aq-mt-2">
                          <Badge tone="neutral" icon={false}>{PDCA_TH[e.pdcaStage]}</Badge>
                          {e.containsPii && !e.piiResolved && <Badge tone="bad" title="พบข้อมูลส่วนบุคคลที่ยังไม่จัดการ">PII</Badge>}
                          {e.status === 'verified' && <Badge tone="ok">ตรวจแล้ว</Badge>}
                        </div>
                      </div>
                      <div className="aq-cluster">
                        {editable && <button type="button" className="aq-btn aq-btn-compact" onClick={() => insertCitation(e.code)} data-testid={`insert-${e.code}`}>แทรก [{e.code}]</button>}
                        {canEvidenceWrite && (
                          <button type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-btn-compact" aria-label={`เลิกผูก ${e.code}`} title={`เลิกผูก ${e.code}`} onClick={() => doUnlink(e.id)}>
                            <Icon name="x" size={20} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canEvidenceWrite && linkable.length > 0 && (
                <div className="aq-link-more">
                  <p className="aq-label">ผูกหลักฐานเพิ่ม</p>
                  <input className="aq-input" type="search" placeholder="ค้นหารหัสหรือชื่อหลักฐาน…" aria-label="ค้นหาหลักฐานที่จะผูก"
                    value={linkQ} onChange={e => setLinkQ(e.target.value)} data-testid="link-search" />
                  <select className="aq-input" value={linkId} onChange={e => setLinkId(e.target.value)} aria-label="เลือกหลักฐานที่จะผูก" data-testid="link-select">
                    <option value="">{`— เลือกหลักฐาน (${linkOptions.length}) —`}</option>
                    {linkOptions.map(e => <option key={e.id} value={e.id}>{e.code} · {e.title}</option>)}
                  </select>
                  <button type="button" className="aq-btn" disabled={!linkId} onClick={doLink} data-testid="link-btn"><Icon name="link" size={20} />ผูก</button>
                </div>
              )}
              {canEvidenceWrite && (
                <Link className="aq-btn aq-btn-ghost aq-mt-4" href={`/app/evidence?new=1&cycle=${encodeURIComponent(cycle.id)}&req=${encodeURIComponent(req.id)}`}>
                  <Icon name="plus" size={20} />อัปโหลดหลักฐานใหม่สำหรับข้อนี้
                </Link>
              )}
            </div>
          )}

          {side === 'comments' && (
            <div id="sidepanel-comments" role="tabpanel" aria-labelledby="sidetab-comments" className="aq-tabpanel">
              <h2 className="aq-h3">{`ความเห็น (${unresolved} ค้าง)`}</h2>
              {comments.length === 0 ? <Empty icon="inbox-check" title="ยังไม่มีความเห็น" /> : (
                <ul className="aq-list" data-testid="comments">
                  {comments.map(c => (
                    <li key={c.id} className={c.resolvedAt ? 'aq-resolved' : ''}>
                      <div className="aq-flex-1">
                        <strong>{names[c.authorId] || c.authorId}</strong> <span className="aq-meta">{fmtDateTime(c.at)}</span>
                        <p>{c.body}</p>
                      </div>
                      {!c.resolvedAt && can(user, 'comment', scope) && (
                        <button type="button" className="aq-btn aq-btn-compact" onClick={() => { try { resolveComment(user, c.id); reload(); } catch (e) { showToast(errMsg(e), 'error'); } }}>แก้แล้ว</button>
                      )}
                      {c.resolvedAt && <Badge tone="ok">แก้แล้ว</Badge>}
                    </li>
                  ))}
                </ul>
              )}
              {can(user, 'comment', scope) && !sessionLost && (
                <div className="aq-field aq-mt-4">
                  <label htmlFor="comment-body">ความเห็นใหม่</label>
                  <textarea id="comment-body" className="aq-textarea" rows={3} value={cBody} onChange={e => setCBody(e.target.value)} data-testid="comment-body" />
                  <button type="button" className="aq-btn aq-mt-2" disabled={!cBody.trim()} onClick={doComment} data-testid="comment-add">ส่งความเห็น</button>
                </div>
              )}
            </div>
          )}

          {side === 'history' && (
            <div id="sidepanel-history" role="tabpanel" aria-labelledby="sidetab-history" className="aq-tabpanel" data-testid="versions">
              {reviewEvents.length > 0 && (
                <>
                  <h2 className="aq-h3">{`ประวัติการตรวจ (${reviewEvents.length})`}</h2>
                  <ul className="aq-list aq-mb-4" data-testid="review-history">
                    {[...reviewEvents].reverse().map(ev => (
                      <li key={ev.id}>
                        <div className="aq-flex-1">
                          <span>{fmtDateTime(ev.at)}</span>{' '}
                          <Badge icon={false} tone={ev.toStatus === 'changes_requested' ? 'warn' : ev.toStatus === 'approved' ? 'ok' : 'neutral'}>
                            {SECTION_STATUS_TH[ev.toStatus as SarSection['status']] ?? ev.toStatus}
                          </Badge>
                          <div className="aq-meta">{names[ev.actorId] || ev.actorId}</div>
                          {ev.note?.trim() && <p className="aq-mt-2">{`“${ev.note.trim()}”`}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h2 className="aq-h3">{`ประวัติเวอร์ชัน (${versions.length})`}</h2>
              {versions.length === 0 ? <Empty icon="clock" title="ยังไม่มีเวอร์ชันที่บันทึก" /> : (
                <ul className="aq-list">
                  {versions.map(v => (
                    <li key={v.id}>
                      <div className="aq-flex-1">
                        <span>{fmtDateTime(v.savedAt)}</span>{' '}
                        <Badge icon={false}>{v.reason === 'autosave' ? 'อัตโนมัติ' : v.reason === 'manual' ? 'บันทึกเอง' : v.reason === 'ai_accept' ? 'จาก AI' : 'ส่งตรวจ'}</Badge>
                        <div className="aq-meta">{names[v.savedBy] || v.savedBy}</div>
                      </div>
                      {editable && <button type="button" className="aq-btn aq-btn-compact" onClick={() => doRestore(v)}>กู้คืน</button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────── C24 Save indicator ───────────────────────────

function SaveIndicator({ state, editable, onRetry }: { state: SaveState; editable: boolean; onRetry: () => void }) {
  if (!editable) return <span className="aq-saved" role="status" data-testid="save-status"><Icon name="eye" size={16} />อ่านอย่างเดียว</span>;
  if (state.kind === 'dirty') return <span className="aq-saved aq-saved--dirty" role="status" data-testid="save-status"><Icon name="clock" size={16} />ยังไม่บันทึก — กำลังพิมพ์…</span>;
  if (state.kind === 'saved') {
    const t = new Date(state.at!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return <span className="aq-saved aq-saved--saved" role="status" data-testid="save-status"><Icon name="check-circle" size={16} />บันทึกแล้ว {t}</span>;
  }
  if (state.kind === 'error') {
    return (
      <span className="aq-saved aq-saved--error" role="status" data-testid="save-status">
        <Icon name="x-circle" size={16} />ยังไม่ได้บันทึก: {state.msg}
        <button type="button" className="aq-btn aq-btn-ghost aq-btn-compact" onClick={onRetry}>ลองบันทึกอีกครั้ง</button>
      </span>
    );
  }
  return <span className="aq-saved" role="status" data-testid="save-status"><Icon name="pencil" size={16} />พร้อมแก้ไข</span>;
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
    <div className="aq-ai-result" data-testid="ai-result">
      <div className="aq-cluster">
        <Badge tone="info" icon="sparkle">{run.feature === 'AI-2' ? 'ร่างเนื้อหา' : 'ตรวจเนื้อหา'}</Badge>
        <span><ModelBadge run={run} />{offline && <Term k="offline" label="โหมดในเครื่อง" />}</span>
        <span><Badge tone="neutral" icon={false}>ปกปิดข้อมูลส่วนบุคคล {run.redactionCount} จุด</Badge><Term k="redaction" label="การปกปิดข้อมูลส่วนบุคคล" /></span>
        {!emptyDraft && <Badge tone={pc.ok ? 'ok' : 'warn'} testId="postcheck">{pc.ok ? 'ผ่านการตรวจอ้างอิง/ตัวเลข' : 'พบข้อควรระวัง'}</Badge>}
      </div>
      {offline && run.feature === 'AI-2' && (
        <p className="aq-help" data-testid="ai-offline-note">โหมดในเครื่องสร้างเป็นโครงร่างหัวข้อจากหลักฐานที่ผูก ไม่ใช่ร่างฉบับเต็ม — ใช้เป็นจุดเริ่มแล้วเขียนต่อเอง</p>
      )}
      {!pc.ok && !emptyDraft && (
        <ul className="aq-warnlist">
          {pc.removedCitations.length > 0 && <li>ตัดการอ้างอิงที่ไม่มีจริงออกแล้ว: {pc.removedCitations.join(', ')}</li>}
          {pc.unknownNumbers.length > 0 && <li>ตัวเลขที่ไม่พบในข้อมูลต้นทาง (ตรวจสอบก่อนใช้): {pc.unknownNumbers.join(', ')}</li>}
          {pc.flaggedSentences.map((s, i) => <li key={i}>ประโยคที่ติดธง: {s}</li>)}
        </ul>
      )}
      {run.feature === 'AI-2' && (
        <>
          {emptyDraft
            ? <InlineMessage tone="info">ยังร่างไม่ได้เพราะยังไม่มีหลักฐานที่ผูก — ผูกหลักฐานในแท็บหลักฐานก่อน</InlineMessage>
            : <div className="aq-ai-draft aq-prose aq-prose--pre" data-testid="ai-draft-text">{out.draft}</div>}
          {out.missing && out.missing.length > 0 && <div><strong>ยังขาด:</strong><ul>{out.missing.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
          {!emptyDraft && (
            <div className="aq-cluster">
              <div className="aq-seg" role="radiogroup" aria-label="วิธีใส่ร่าง">
                <button type="button" role="radio" aria-checked={aiMode === 'append'} onClick={() => setAiMode('append')}>ต่อท้ายข้อความเดิม</button>
                <button type="button" role="radio" aria-checked={aiMode === 'replace'} onClick={() => setAiMode('replace')}>แทนที่ทั้งหมด</button>
              </div>
              <Term k="append_replace" label="ต่อท้าย / แทนที่" />
            </div>
          )}
        </>
      )}
      {run.feature === 'AI-3' && (
        <div data-testid="ai-review-result">
          {([['ยังไม่ได้ตอบ', out.unanswered], ['ประโยคที่ไม่มีอ้างอิง', out.uncitedSentences], ['ข้อเสนอแนะ', out.suggestions]] as const).map(([t, list]) =>
            list && list.length > 0 ? <div key={t}><strong>{t}</strong><ul>{list.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null)}
        </div>
      )}
      <div className="aq-actions aq-mt-4">
        <button type="button" className="aq-btn aq-btn-primary" onClick={onAccept} disabled={!canAccept || emptyDraft} data-testid="ai-accept">
          {run.feature === 'AI-2' ? 'ยอมรับและใส่ในเอกสาร' : 'รับทราบ'}
        </button>
        <button type="button" className="aq-btn aq-btn-ghost" onClick={onDiscard} data-testid="ai-discard">ทิ้ง</button>
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
    <section className="aq-card" aria-labelledby="rate-h" data-testid="rating-panel">
      <h2 id="rate-h" className="aq-h3">คะแนนประเมินตนเอง (1–7) <Term k="self_rating" label="สเกล 1–7" /></h2>
      <div className="aq-form-inline">
        <div className="aq-field">
          <label htmlFor="self-score">คะแนน</label>
          <select id="self-score" className="aq-input" value={score} disabled={!canSelf}
            onChange={e => { setScore(e.target.value); touchSession(); }} data-testid="self-score">
            <option value="">— ยังไม่ให้คะแนน —</option>
            {RATING_SCALE.map(s => <option key={s.score} value={s.score}>{`${s.score} — ${s.nameTh}`}</option>)}
          </select>
        </div>
        <div className="aq-field aq-flex-1">
          <label htmlFor="self-why">เหตุผลประกอบ</label>
          <input id="self-why" className="aq-input" value={why} disabled={!canSelf}
            onChange={e => { setWhy(e.target.value); touchSession(); }} data-testid="self-why" />
        </div>
        {canSelf && <button type="button" className="aq-btn" disabled={!score} onClick={saveSelf} data-testid="self-save">บันทึกคะแนน</button>}
      </div>
      {mayRate && !sectionEditable && <p className="aq-btn-reason aq-mt-2">ข้อนี้อยู่ระหว่างตรวจหรืออนุมัติแล้ว จึงแก้คะแนนไม่ได้</p>}
      {self && <p className="aq-meta aq-mt-2">ล่าสุด: {self.score} คะแนน ({fmtDateTime(self.at)})</p>}
      {committee && (
        <div className="aq-mt-4">
          <h3 className="aq-h3">คะแนนกรรมการประเมิน (รายข้อเดิม)</h3>
          <p>คะแนน {committee.score} — {committee.rationale || 'ไม่มีเหตุผล'}</p>
        </div>
      )}
    </section>
  );
}

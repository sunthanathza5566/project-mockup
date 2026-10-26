'use client';

/**
 * ฟอร์มขอเข้าใช้งาน `/request-access` (friendly-spec §F6 · ADR-AUTH-001 O2/A3/A7 · standards/security-auth P1–P6)
 * - **ไม่มีช่อง/ค่าใดเกี่ยวกับบทบาท** (ไม่มี select role, ไม่มี hidden field) — ผู้ดูแลกำหนดบทบาทตอนอนุมัติ
 * - ส่งเฉพาะ field ใน allowlist ของ AccessRequestInput (backend ละเลย field อื่นอยู่แล้ว)
 * - ตรวจฝั่ง client ก่อนส่ง (ข้อความใต้ช่อง aq-field-error + aria-invalid + aria-describedby) แล้ว focus ช่องแรกที่ผิด
 *   + กล่องสรุป error หัวฟอร์ม `ra-error-summary` (ลิงก์ `ra-error-link-<field>` → focus ช่อง) — V1 m6
 *   error จาก API ที่ผูกกับช่องได้ (username/อีเมลซ้ำ, โดเมน, หน่วยงาน) แสดงใต้ช่องนั้น ที่เหลือแสดงหัวฟอร์ม
 * - PDPA: กล่อง "ประกาศความเป็นส่วนตัว" แจ้ง 6 เรื่องตาม ม.23 ก่อนกดส่ง (P2) · checkbox = "รับทราบ" (ฐาน ม.24(3)
 *   ดำเนินการตามคำขอของเจ้าของข้อมูล) ไม่ใช่ "ยินยอม" (P4) · ฟิลด์เท่าที่จำเป็นตาม P1
 * - หน่วยงาน: value `f:<facultyId>` / `p:<programmeId>` / '' (อื่น ๆ ทั้งมหาวิทยาลัย) — ใช้ได้เมื่ออีเมลตรงโดเมนเท่านั้น
 * - state: กำลังเตรียมข้อมูล (seed) → skeleton · initError → danger · สำเร็จ → การ์ด `ra-success`
 */
import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import type { University } from '@/lib/types';
import {
  AunqaError, EMAIL_RE, PASSWORD_MAX, PASSWORD_MIN, USERNAME_RE, findUniversityByEmail, getFaculties, getProgrammes,
  submitAccessRequest,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { InlineMessage, Skeleton } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Textarea } from '@/components/ui/primitives/textarea';

type Field = 'name' | 'email' | 'unit' | 'position' | 'reason' | 'username' | 'password' | 'password2' | 'consent';
type Errors = Partial<Record<Field, string>>;
const ORDER: Field[] = ['name', 'email', 'unit', 'position', 'reason', 'username', 'password', 'password2', 'consent'];

const LABEL = 'block text-base font-medium text-foreground';
const SECTION = 'text-lg font-semibold text-foreground';

/** label + ช่อง + help + error — ดอกจัน "*" แยก node (key แปลของ dict = ข้อความ label ล้วน) */
function FieldRow({ id, label, required, help, error, children }: {
  id: string; label: string; required?: boolean; help?: ReactNode; error?: string; children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {help && <div className="aq-help" id={`${id}-help`}>{help}</div>}
      {error && <p className="aq-field-error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

/** aria-describedby ของช่อง: help (ถ้ามี) + error (ถ้ามี) */
function described(id: string, hasHelp: boolean, err?: string): string | undefined {
  const ids = [hasHelp && `${id}-help`, err && `${id}-err`].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

/** ผูกข้อความ error จาก API กับช่อง (ข้อความไทยตาม onboarding.store) — ไม่ตรงช่องไหน = null (แสดงหัวฟอร์ม) */
function fieldOfApiError(e: AunqaError): Field | null {
  const m = e.message;
  if (m.includes('Username')) return 'username';
  if (m.includes('อีเมล')) return 'email';
  if (m.includes('หน่วยงาน')) return 'unit';
  if (m.includes('รหัสผ่าน')) return 'password';
  if (m.includes('ชื่อ')) return 'name';
  if (m.includes('ตำแหน่ง')) return 'position';
  if (m.includes('เหตุผล')) return 'reason';
  if (m.includes('รับทราบ')) return 'consent';
  return null;
}

export default function RequestAccessForm() {
  const { isLoading, initError } = useAuth();
  const uid = useId();
  const ids = useMemo(() => Object.fromEntries(ORDER.map(f => [f, `ra-${f}-${uid}`])) as Record<Field, string>, [uid]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [uni, setUni] = useState<University | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [unit, setUnit] = useState('');
  const [position, setPosition] = useState('');
  const [reason, setReason] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  /** ช่องที่ผิดตอนกดส่งล่าสุด — กล่องสรุป error ด้านบน (V1 m6, GOV.UK error summary) แสดงเฉพาะช่องที่ยังผิดอยู่ */
  const [summary, setSummary] = useState<Field[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const faculties = useMemo(() => (uni ? getFaculties(uni.id) : []), [uni]);
  const programmes = useMemo(() => (uni ? getProgrammes(uni.id) : []), [uni]);

  function clearErr(f: Field) { if (errors[f]) setErrors(e => ({ ...e, [f]: undefined })); }

  /** ตรวจโดเมนเมื่อออกจากช่องอีเมล → แสดงชื่อมหาวิทยาลัย / error · เปลี่ยนมหาวิทยาลัย = ล้างหน่วยงาน */
  function checkEmail(value = email): { err?: string; found: University | null } {
    const v = value.trim();
    if (!v) return { err: 'กรุณากรอกอีเมลมหาวิทยาลัย', found: null };
    if (!EMAIL_RE.test(v)) return { err: 'รูปแบบอีเมลไม่ถูกต้อง', found: null };
    const found = findUniversityByEmail(v);
    if (!found) return { err: 'อีเมลนี้ไม่ใช่โดเมนของมหาวิทยาลัยที่ใช้ระบบนี้', found: null };
    return { found };
  }
  function onEmailBlur() {
    if (!email.trim()) { setEmailChecked(false); setUni(null); return; }
    const r = checkEmail();
    if (r.found?.id !== uni?.id) setUnit('');
    setUni(r.found);
    setEmailChecked(true);
    setErrors(e => ({ ...e, email: r.err }));
  }

  function validate(): { errs: Errors; found: University | null } {
    const errs: Errors = {};
    if (!name.trim()) errs.name = 'กรุณากรอกชื่อ-สกุล';
    else if (name.trim().length > 100) errs.name = 'ชื่อ-สกุลต้องไม่เกิน 100 ตัวอักษร';
    const r = checkEmail();
    if (r.err) errs.email = r.err;
    if (position.trim().length > 100) errs.position = 'ตำแหน่ง/หน้าที่ต้องไม่เกิน 100 ตัวอักษร';
    if (!reason.trim()) errs.reason = 'กรุณาระบุเหตุผลที่ขอใช้งาน';
    else if (reason.trim().length > 500) errs.reason = 'เหตุผลต้องไม่เกิน 500 ตัวอักษร';
    if (!USERNAME_RE.test(username.trim())) errs.username = 'ชื่อผู้ใช้ต้องเป็น a-z 0-9 . _ - ยาว 3–32 ตัว';
    if (password.length < PASSWORD_MIN) errs.password = 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
    else if (password.length > PASSWORD_MAX) errs.password = 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร';
    if (!password2) errs.password2 = 'กรุณายืนยันรหัสผ่าน';
    else if (password2 !== password) errs.password2 = 'รหัสผ่านไม่ตรงกัน';
    if (!consent) errs.consent = 'กรุณาติ๊กรับทราบประกาศความเป็นส่วนตัวก่อนส่งคำขอ';
    return { errs, found: r.found };
  }

  function focusFirst(errs: Errors) {
    const first = ORDER.find(f => errs[f]);
    if (first) setTimeout(() => document.getElementById(ids[first])?.focus(), 0);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError('');
    const { errs, found } = validate();
    setUni(found); setEmailChecked(!!email.trim());
    setErrors(errs);
    const bad = ORDER.filter(f => errs[f]);
    setSummary(bad);
    if (bad.length) { focusFirst(errs); return; }

    const [kind, unitId] = unit.split(':');
    const prog = kind === 'p' ? programmes.find(p => p.id === unitId) : undefined;
    setBusy(true);
    try {
      // allowlist field เท่านั้น — ไม่มี roles/status (ADR-AUTH-001 A7)
      const res = await submitAccessRequest({
        fullName: name.trim(), email: email.trim(), username: username.trim(), password,
        programmeId: prog?.id,
        facultyId: prog ? prog.facultyId : kind === 'f' ? unitId : undefined,
        positionText: position.trim() || undefined, reason: reason.trim(), consent,
      });
      setPassword(''); setPassword2('');
      setDone(res.username);
    } catch (err) {
      if (err instanceof AunqaError) {
        const f = fieldOfApiError(err);
        if (f) { const next = { [f]: err.message } as Errors; setErrors(next); setSummary([f]); focusFirst(next); }
        else setFormError(err.message);
      } else {
        setFormError('ส่งคำขอไม่สำเร็จ โปรดลองอีกครั้ง');
      }
    } finally {
      setBusy(false);
    }
  }

  const head = (
    <div className="w-full max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground">ขอเข้าใช้งาน</h1>
      <p className="mt-1 text-base text-muted-foreground">กรอกข้อมูลเพื่อขอบัญชี ผู้ดูแลระบบของมหาวิทยาลัยจะตรวจสอบและกำหนดบทบาทให้</p>
    </div>
  );
  const CARD = 'w-full max-w-xl rounded-xl border bg-card p-6 text-card-foreground shadow-sm dark:shadow-none md:p-8';
  const back = (
    <Link href="/login" className="inline-flex min-h-11 items-center gap-1 text-base">
      <Icon name="chevron-left" size={20} />กลับไปหน้าเข้าสู่ระบบ
    </Link>
  );

  if (initError) {
    return <>{head}<div className={CARD}><InlineMessage tone="danger">{initError}</InlineMessage><div className="mt-4">{back}</div></div></>;
  }
  if (isLoading) {
    return <>{head}<div className={CARD} aria-busy="true"><Skeleton kind="form" /></div></>;
  }
  if (done) {
    return (
      <div className={CARD} data-testid="ra-success">
        <InlineMessage tone="success" large title="ส่งคำขอแล้ว">
          {`ผู้ดูแลระบบจะตรวจสอบคำขอของคุณ เมื่ออนุมัติแล้วเข้าสู่ระบบด้วยชื่อผู้ใช้ ${done} ได้ทันที`}
        </InlineMessage>
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
        </Button>
      </div>
    );
  }

  const unitDisabled = !uni;
  const liveSummary = summary.filter(f => errors[f]);
  return (
    <>
      {head}
      <div className={CARD}>
        <InlineMessage tone="info" testId="ra-demo-note">
          ระบบสาธิต: คำขอถูกเก็บในเบราว์เซอร์นี้เท่านั้น — ผู้ดูแลต้องเข้าสู่ระบบจากเบราว์เซอร์เดียวกันเพื่ออนุมัติ
        </InlineMessage>
        {formError && <InlineMessage tone="danger" className="mt-4" testId="ra-error">{formError}</InlineMessage>}
        {/* สรุป error (role=alert จาก tone danger) — ลิงก์ = ข้อความ error ของช่อง กดแล้ว focus ช่องนั้น · หัวข้อคงที่ ลดการประกาศซ้ำ */}
        {liveSummary.length > 0 && (
          <InlineMessage tone="danger" className="mt-4" testId="ra-error-summary" title="ยังส่งคำขอไม่ได้ — กรุณาแก้ไขช่องต่อไปนี้">
            <ul className="m-0 list-disc space-y-1 pl-5">
              {liveSummary.map(f => (
                <li key={f}>
                  <a
                    href={`#${ids[f]}`} data-testid={`ra-error-link-${f}`}
                    className="font-medium text-foreground underline underline-offset-4 visited:text-foreground hover:text-foreground hover:decoration-2"
                    onClick={e => { e.preventDefault(); document.getElementById(ids[f])?.focus(); }}
                  >
                    {errors[f]}
                  </a>
                </li>
              ))}
            </ul>
          </InlineMessage>
        )}

        <form ref={formRef} noValidate onSubmit={onSubmit} className="mt-6 space-y-8">
          <fieldset className="m-0 min-w-0 space-y-5 border-0 p-0">
            <legend className={SECTION}>ข้อมูลของคุณ</legend>
            <FieldRow id={ids.name} label="ชื่อ-สกุล" required error={errors.name}>
              <Input
                id={ids.name} data-testid="ra-name" value={name} autoComplete="name" maxLength={100}
                onChange={e => { setName(e.target.value); clearErr('name'); }}
                required aria-required="true" aria-invalid={!!errors.name || undefined}
                aria-describedby={described(ids.name, false, errors.name)}
              />
            </FieldRow>

            <FieldRow
              id={ids.email} label="อีเมลมหาวิทยาลัย" required error={errors.email}
              help={<>
                <span>ใช้อีเมลที่ลงท้ายด้วยโดเมนของมหาวิทยาลัย</span>
                {emailChecked && uni && !errors.email && (
                  <span className="mt-1 flex items-center gap-1.5 font-medium text-success" data-testid="ra-email-uni">
                    <Icon name="check-circle" size={16} />{uni.nameTh}
                  </span>
                )}
              </>}
            >
              <Input
                id={ids.email} data-testid="ra-email" type="email" inputMode="email" value={email} autoComplete="email"
                autoCapitalize="none" spellCheck={false} maxLength={254}
                onChange={e => { setEmail(e.target.value); setEmailChecked(false); clearErr('email'); }}
                onBlur={onEmailBlur}
                required aria-required="true" aria-invalid={!!errors.email || undefined}
                aria-describedby={described(ids.email, true, errors.email)}
              />
            </FieldRow>

            <FieldRow
              id={ids.unit} label="หลักสูตร/หน่วยงาน" error={errors.unit}
              help={unitDisabled ? 'กรอกอีเมลมหาวิทยาลัยก่อน จึงจะเลือกหน่วยงานได้' : undefined}
            >
              <NativeSelect
                id={ids.unit} data-testid="ra-unit" value={unit} disabled={unitDisabled}
                onChange={e => { setUnit(e.target.value); clearErr('unit'); }}
                aria-invalid={!!errors.unit || undefined}
                aria-describedby={described(ids.unit, unitDisabled, errors.unit)}
              >
                <option value="">— เลือก —</option>
                {faculties.map(f => (
                  <optgroup key={f.id} label={f.nameTh}>
                    <option value={`f:${f.id}`}>{f.nameTh}</option>
                    {programmes.filter(p => p.facultyId === f.id).map(p => (
                      <option key={p.id} value={`p:${p.id}`}>{p.nameTh}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="u:">อื่น ๆ (ทั้งมหาวิทยาลัย)</option>
              </NativeSelect>
            </FieldRow>

            <FieldRow
              id={ids.position} label="ตำแหน่ง/หน้าที่" error={errors.position}
              help="เป็นข้อมูลประกอบ ไม่ใช่การเลือกสิทธิ์"
            >
              <Input
                id={ids.position} data-testid="ra-position" value={position} maxLength={100}
                placeholder="เช่น อาจารย์ประจำหลักสูตร"
                onChange={e => { setPosition(e.target.value); clearErr('position'); }}
                aria-invalid={!!errors.position || undefined}
                aria-describedby={described(ids.position, true, errors.position)}
              />
            </FieldRow>

            <FieldRow id={ids.reason} label="เหตุผลที่ขอใช้งาน" required error={errors.reason}>
              <Textarea
                id={ids.reason} data-testid="ra-reason" rows={3} value={reason} maxLength={500}
                onChange={e => { setReason(e.target.value); clearErr('reason'); }}
                required aria-required="true" aria-invalid={!!errors.reason || undefined}
                aria-describedby={described(ids.reason, false, errors.reason)}
              />
            </FieldRow>
          </fieldset>

          <fieldset className="m-0 min-w-0 space-y-5 border-0 p-0">
            <legend className={SECTION}>ตั้งค่าการเข้าสู่ระบบ</legend>
            <FieldRow id={ids.username} label="ชื่อผู้ใช้" required error={errors.username} help="a-z 0-9 . _ - ยาว 3–32 ตัว">
              <Input
                id={ids.username} data-testid="ra-username" value={username} maxLength={32}
                autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                onChange={e => { setUsername(e.target.value); clearErr('username'); }}
                required aria-required="true" aria-invalid={!!errors.username || undefined}
                aria-describedby={described(ids.username, true, errors.username)}
              />
            </FieldRow>

            <FieldRow
              id={ids.password} label="รหัสผ่าน" required error={errors.password}
              help={<><span>อย่างน้อย 8 ตัวอักษร</span> <span>ใช้วลีที่จำง่ายได้ ไม่ต้องผสมตัวเลขหรือสัญลักษณ์</span></>}
            >
              <div className="relative">
                <Input
                  id={ids.password} data-testid="ra-password" className="pr-12" type={showPw ? 'text' : 'password'}
                  value={password} autoComplete="new-password" maxLength={PASSWORD_MAX}
                  onChange={e => { setPassword(e.target.value); clearErr('password'); }}
                  required aria-required="true" aria-invalid={!!errors.password || undefined}
                  aria-describedby={described(ids.password, true, errors.password)}
                />
                <Button
                  variant="ghost" size="icon"
                  className="absolute right-0 top-0 border-transparent bg-transparent aria-pressed:border-transparent aria-pressed:bg-transparent aria-pressed:text-foreground aria-pressed:shadow-none"
                  onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPw}
                >
                  <Icon name={showPw ? 'eye-off' : 'eye'} size={20} />
                </Button>
              </div>
            </FieldRow>

            <FieldRow id={ids.password2} label="ยืนยันรหัสผ่าน" required error={errors.password2}>
              <Input
                id={ids.password2} data-testid="ra-password2" type={showPw ? 'text' : 'password'}
                value={password2} autoComplete="new-password" maxLength={PASSWORD_MAX}
                onChange={e => { setPassword2(e.target.value); clearErr('password2'); }}
                required aria-required="true" aria-invalid={!!errors.password2 || undefined}
                aria-describedby={described(ids.password2, false, errors.password2)}
              />
            </FieldRow>
          </fieldset>

          {/* ประกาศความเป็นส่วนตัว — แจ้งก่อนเก็บตาม PDPA ม.23 (P2) ครบ 6 เรื่อง · ไม่พับซ่อน */}
          <section aria-labelledby={`${uid}-privacy`} className="space-y-3 rounded-lg border bg-muted p-4" data-testid="ra-privacy">
            <h2 id={`${uid}-privacy`} className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Icon name="shield-check" size={20} className="text-primary" />ประกาศความเป็นส่วนตัว
            </h2>
            <ul className="m-0 list-disc space-y-1.5 pl-5 text-base text-foreground">
              <li>วัตถุประสงค์: ใช้พิจารณาให้สิทธิ์ใช้งานระบบและดูแลบัญชีของคุณเท่านั้น ตามคำขอของคุณเอง</li>
              <li>หากไม่ให้ข้อมูลที่จำเป็น (ช่องที่มี *) จะส่งคำขอใช้งานไม่ได้</li>
              <li>ข้อมูลที่เก็บ: ชื่อ-สกุล อีเมล หน่วยงาน ตำแหน่ง เหตุผล และชื่อผู้ใช้ (รหัสผ่านเก็บแบบเข้ารหัสทางเดียว)</li>
              <li>ระยะเวลาเก็บ: ถ้าคำขอถูกปฏิเสธ ลบทันที · ถ้าอนุมัติ เก็บตลอดอายุบัญชี · บันทึกการใช้งานเก็บเฉพาะโดเมนอีเมล</li>
              <li>ผู้ที่เห็นข้อมูล: ผู้ดูแลระบบของมหาวิทยาลัยที่คุณสังกัดเท่านั้น</li>
              <li>สิทธิของคุณ: ขอดู แก้ไข หรือลบข้อมูล และสอบถามเรื่องข้อมูลส่วนบุคคลได้ที่ผู้ดูแลระบบของมหาวิทยาลัย</li>
            </ul>
            <label htmlFor={ids.consent} className="flex min-h-11 cursor-pointer items-start gap-3 pt-1 text-base text-foreground">
              <input
                id={ids.consent} data-testid="ra-consent" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-primary"
                checked={consent} onChange={e => { setConsent(e.target.checked); clearErr('consent'); }}
                required aria-required="true" aria-invalid={!!errors.consent || undefined}
                aria-describedby={described(ids.consent, false, errors.consent)}
              />
              <span>ฉันรับทราบว่าข้อมูลนี้ใช้เพื่อพิจารณาให้สิทธิ์ใช้งานระบบเท่านั้น หากคำขอถูกปฏิเสธ ข้อมูลจะถูกลบ</span>
            </label>
            {errors.consent && <p className="aq-field-error" id={`${ids.consent}-err`}>{errors.consent}</p>}
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {back}
            <Button type="submit" data-testid="ra-submit" disabled={busy} aria-busy={busy || undefined}>
              {busy ? <><Icon name="loader" size={20} className="animate-spin" />กำลังส่งคำขอ…</> : 'ส่งคำขอ'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

'use client';

/**
 * RequirementPicker — เลือกข้อแบบ combobox + chip (ADR-UI-001 components.md C4; WAI-ARIA APG "combobox with listbox popup")
 * หน้าตา ADR-UI-002 saas-spec §C17: ช่องค้น = Input · listbox bg-popover · option ที่ active มีกรอบ ring · chip พื้น primary-muted
 * - พิมพ์เลขข้อ ("1.1", "3") หรือคำ → กรองด้วย searchRequirements · ว่าง = ทั้ง 53 ข้อจัดกลุ่มตามเกณฑ์
 * - ↓/↑ เลื่อน · Enter = เพิ่ม/เอาออก (คงกล่องเปิด ล้างคำค้น) · Esc ปิด · Backspace ในช่องว่าง = ลบ chip ล่าสุด
 * - testid: container `{prefix}s` · input `{prefix}s-input` · option `{prefix}-opt-{id}` · chip `{prefix}-chip-{id}`
 *   (ค่าเริ่มต้น prefix = "ev-f-req" → ev-f-reqs / ev-f-reqs-input / ev-f-req-opt-1.1 / ev-f-req-chip-1.1)
 * - R2-F12 `locked` (id → เหตุผล เช่น "อนุมัติแล้ว"): option เลือกไม่ได้ (aria-disabled) + ป้าย "ล็อกแล้ว" `{prefix}-opt-lock-{id}`
 *   (N4 R2-F13: ชื่อข้อตัดได้ 2 บรรทัด · <480 ป้ายเหลือไอคอนกุญแจ ข้อความ "ล็อกแล้ว" เป็น sr-only)
 *   + คำอธิบายใต้ช่อง `{prefix}s-locked-note` · คลิก/Enter ที่ข้อล็อก = ไม่เพิ่ม แต่เอาออกได้ถ้าอยู่ใน chip แล้ว (เช่นมาจาก ?req=)
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { compareReqId, listCriteria, listRequirements, searchRequirements } from '@/lib/api';
import Icon from '@/components/ui/Icon';
import { Input } from '@/components/ui/primitives/input';
import { cn } from '@/lib/ui/cn';

export interface RequirementPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** ข้อความช่วยใต้ช่องเมื่อ disabled */
  disabledHint?: string;
  label: string;
  help?: string;
  testIdPrefix?: string;
  /** ข้อที่ล็อก (ส่งตรวจ/อนุมัติแล้ว) → เหตุผลสั้น ๆ; เลือกเพิ่มไม่ได้ */
  locked?: ReadonlyMap<string, string>;
}

export default function RequirementPicker({ value, onChange, disabled, disabledHint, label, help, testIdPrefix = 'ev-f-req', locked }: RequirementPickerProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const criteria = useMemo(() => new Map(listCriteria().map(c => [c.no, c.nameTh])), []);

  const options = useMemo(() => {
    const base = q.trim() ? searchRequirements(q) : listRequirements();
    return base.slice().sort((a, b) => compareReqId(a.id, b.id));
  }, [q]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, uid]);

  function toggle(id: string) {
    if (locked?.has(id) && !value.includes(id)) return; // ข้อล็อก: เอาออกได้ เพิ่มไม่ได้
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id].sort(compareReqId));
    setQ('');
    input.current?.focus();
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { if (open && options[active]) { e.preventDefault(); toggle(options[active].id); } }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); setOpen(false); } }
    else if (e.key === 'Backspace' && !q && value.length) { onChange(value.slice(0, -1)); }
  }

  let lastCrit = 0;
  return (
    <div className="relative grid min-w-0 gap-1.5" ref={box} data-testid={`${testIdPrefix}s`}>
      <label htmlFor={`${uid}-input`} className="text-base font-medium text-foreground">{label}</label>
      {help && !disabled && <p className="aq-help">{help}</p>}
      {value.length > 0 && (
        <ul className="flex list-none flex-wrap gap-2" aria-label="ข้อที่เลือก">
          {value.map(id => (
            <li
              key={id} data-testid={`${testIdPrefix}-chip-${id}`}
              className="inline-flex items-center gap-1 rounded-md bg-primary-muted pl-2.5 text-base font-medium tabular-nums text-primary"
            >
              {id}
              <button
                type="button" aria-label={`เอาข้อ ${id} ออก`} disabled={disabled} onClick={() => toggle(id)}
                className="aq-chip__remove inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent transition-colors duration-fast enabled:hover:bg-card disabled:cursor-not-allowed disabled:text-muted-foreground"
              >
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative min-w-0">
        <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={input} id={`${uid}-input`} className="pl-10" type="text" role="combobox"
          aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${uid}-opt-${active}` : undefined}
          aria-describedby={disabled && disabledHint ? `${uid}-hint` : `${uid}-sel`}
          placeholder="พิมพ์เลขข้อหรือคำค้น…" value={q} disabled={disabled} autoComplete="off"
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKey}
          onBlur={e => { if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}
          data-testid={`${testIdPrefix}s-input`}
        />
      </div>
      {open && !disabled && (
        <ul
          id={listId} role="listbox" aria-multiselectable="true" aria-label={label} tabIndex={-1}
          className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-toast m-0 max-h-80 list-none overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg dark:shadow-none"
        >
          {options.length === 0 && <li role="presentation" className="px-3 py-2 text-muted-foreground">ไม่พบข้อที่ตรงกับคำค้น</li>}
          {options.map((r, i) => {
            const head = !q.trim() && r.criterionNo !== lastCrit;
            lastCrit = r.criterionNo;
            const sel = value.includes(r.id);
            const lockWhy = locked?.get(r.id);
            return [
              head ? <li key={`h${r.criterionNo}`} role="presentation" className="aq-meta px-3 pb-1 pt-2 font-medium">{`เกณฑ์ ${r.criterionNo}: ${criteria.get(r.criterionNo) ?? ''}`}</li> : null,
              <li
                key={r.id} id={`${uid}-opt-${i}`} role="option" aria-selected={sel} aria-disabled={lockWhy ? true : undefined}
                className={cn(
                  'grid min-h-11 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-md px-3 py-1 text-base text-foreground aria-selected:bg-accent',
                  i === active && 'bg-accent outline outline-2 -outline-offset-2 outline-ring',
                  lockWhy && !sel && 'cursor-not-allowed text-muted-foreground',
                )}
                onMouseDown={e => e.preventDefault()} onClick={() => toggle(r.id)} onMouseEnter={() => setActive(i)}
                data-testid={`${testIdPrefix}-opt-${r.id}`}
              >
                <strong className={cn('font-medium tabular-nums', lockWhy && 'text-muted-foreground')}>{r.id}</strong>
                <span className="min-w-0 py-0.5 text-muted-foreground">
                  <span className="line-clamp-2 break-words">{r.textTh}</span>
                  {q.trim() && <span className="aq-meta block truncate">{`เกณฑ์ ${r.criterionNo}: ${criteria.get(r.criterionNo) ?? ''}`}</span>}
                  {lockWhy && <span className="aq-meta block truncate">{lockWhy}</span>}
                </span>
                {lockWhy
                  ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-sm font-medium text-muted-foreground" data-testid={`${testIdPrefix}-opt-lock-${r.id}`}>
                      <Icon name="lock" size={14} /><span className="max-sm:sr-only">ล็อกแล้ว</span>
                    </span>
                  )
                  : sel ? <Icon name="check" size={20} className="text-primary" /> : <span aria-hidden="true" />}
              </li>,
            ];
          })}
        </ul>
      )}
      {!disabled && locked && locked.size > 0 && (
        <p className="aq-help inline-flex items-start gap-1.5" data-testid={`${testIdPrefix}s-locked-note`}>
          <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
          {`ข้อที่ส่งตรวจหรืออนุมัติแล้วในรอบนี้ (${locked.size} ข้อ) เลือกไม่ได้ ต้องให้ผู้ตรวจส่งกลับแก้ก่อน`}
        </p>
      )}
      {disabled && disabledHint
        ? <p className="aq-help" id={`${uid}-hint`}>{disabledHint}</p>
        : <p className="aq-help" id={`${uid}-sel`} aria-live="polite">{`เลือกแล้ว: ${value.length ? value.join(', ') : '—'}`}</p>}
    </div>
  );
}

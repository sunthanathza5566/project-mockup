'use client';

/**
 * RequirementPicker — เลือกข้อแบบ combobox + chip (ADR-UI-001 components.md C4; WAI-ARIA APG "combobox with listbox popup")
 * - พิมพ์เลขข้อ ("1.1", "3") หรือคำ → กรองด้วย searchRequirements · ว่าง = ทั้ง 53 ข้อจัดกลุ่มตามเกณฑ์
 * - ↓/↑ เลื่อน · Enter = เพิ่ม/เอาออก (คงกล่องเปิด ล้างคำค้น) · Esc ปิด · Backspace ในช่องว่าง = ลบ chip ล่าสุด
 * - testid: container `{prefix}s` · input `{prefix}s-input` · option `{prefix}-opt-{id}` · chip `{prefix}-chip-{id}`
 *   (ค่าเริ่มต้น prefix = "ev-f-req" → ev-f-reqs / ev-f-reqs-input / ev-f-req-opt-1.1 / ev-f-req-chip-1.1)
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { compareReqId, listCriteria, listRequirements, searchRequirements } from '@/lib/api';
import Icon from '@/components/ui/Icon';

export interface RequirementPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** ข้อความช่วยใต้ช่องเมื่อ disabled */
  disabledHint?: string;
  label: string;
  help?: string;
  testIdPrefix?: string;
}

export default function RequirementPicker({ value, onChange, disabled, disabledHint, label, help, testIdPrefix = 'ev-f-req' }: RequirementPickerProps) {
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
    <div className="aq-picker" ref={box} data-testid={`${testIdPrefix}s`}>
      <label htmlFor={`${uid}-input`} className="aq-label">{label}</label>
      {help && !disabled && <p className="aq-help">{help}</p>}
      {value.length > 0 && (
        <ul className="aq-chips" aria-label="ข้อที่เลือก">
          {value.map(id => (
            <li key={id} className="aq-chip" data-testid={`${testIdPrefix}-chip-${id}`}>
              {id}
              <button type="button" className="aq-chip__remove" aria-label={`เอาข้อ ${id} ออก`} disabled={disabled} onClick={() => toggle(id)}>
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="aq-picker__control">
        <Icon name="search" size={20} className="aq-picker__icon" />
        <input
          ref={input} id={`${uid}-input`} className="aq-input aq-picker__input" type="text" role="combobox"
          aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${uid}-opt-${active}` : undefined}
          aria-describedby={disabled && disabledHint ? `${uid}-hint` : `${uid}-sel`}
          placeholder="พิมพ์เลขข้อหรือคำค้น…" value={q} disabled={disabled} autoComplete="off"
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKey}
          data-testid={`${testIdPrefix}s-input`}
        />
      </div>
      {open && !disabled && (
        <ul id={listId} role="listbox" aria-multiselectable="true" aria-label={label} className="aq-picker__listbox">
          {options.length === 0 && <li role="presentation" className="aq-picker__group">ไม่พบข้อที่ตรงกับคำค้น</li>}
          {options.map((r, i) => {
            const head = !q.trim() && r.criterionNo !== lastCrit;
            lastCrit = r.criterionNo;
            const sel = value.includes(r.id);
            return [
              head ? <li key={`h${r.criterionNo}`} role="presentation" className="aq-picker__group aq-meta">เกณฑ์ {r.criterionNo}: {criteria.get(r.criterionNo)}</li> : null,
              <li
                key={r.id} id={`${uid}-opt-${i}`} role="option" aria-selected={sel}
                className={`aq-picker__opt${i === active ? ' is-active' : ''}`}
                onMouseDown={e => e.preventDefault()} onClick={() => toggle(r.id)} onMouseEnter={() => setActive(i)}
                data-testid={`${testIdPrefix}-opt-${r.id}`}
              >
                <strong className="aq-tnum">{r.id}</strong>
                <span className="aq-picker__opt-text">
                  {r.textTh}
                  {q.trim() && <span className="aq-meta aq-picker__crit">เกณฑ์ {r.criterionNo}: {criteria.get(r.criterionNo)}</span>}
                </span>
                {sel ? <Icon name="check" size={20} /> : <span aria-hidden="true" />}
              </li>,
            ];
          })}
        </ul>
      )}
      {disabled && disabledHint
        ? <p className="aq-help" id={`${uid}-hint`}>{disabledHint}</p>
        : <p className="aq-help" id={`${uid}-sel`} aria-live="polite">เลือกแล้ว: {value.length ? value.join(', ') : '—'}</p>}
    </div>
  );
}

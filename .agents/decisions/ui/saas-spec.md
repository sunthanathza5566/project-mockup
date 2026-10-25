# ADR-UI-002 ภาคผนวก S — Component recipe + หน้าตาต่อหน้า (Modern SaaS)

> บังคับเท่า ADR-UI-002 · **เนื้อหา/ลำดับ/ข้อความ/testid/พฤติกรรม ยึด `ui/pages.md` + `ui/components.md` เดิม** — ไฟล์นี้กำหนดเฉพาะ "หน้าตา" (class Tailwind, layout, ความหนาแน่น) · token ทั้งหมดอ้าง `ui/saas-tokens.md` (§T…)
> เจอสิ่งที่ไฟล์นี้ไม่ได้กำหนด → ใช้ recipe ที่ใกล้ที่สุดในไฟล์นี้ + จดใน Log ว่าเลือกอะไร (ไม่ต้อง BLOCKED ถ้าเป็นเรื่อง spacing/ขนาดรอง) · ถ้าต้องเปลี่ยนข้อความ/โครง DOM/testid/role = BLOCKED ถาม architect

## §0 ภาพรวม "หน้าตา"
- พื้นหน้าเทาอ่อนมาก (`bg-background`) · เนื้อหาอยู่ใน **การ์ดขาวขอบ 1px** (`border bg-card rounded-lg`) · เงาแทบไม่มี · ไม่มีแถบสีเข้มเต็มความกว้างอีกแล้ว
- สีแบรนด์ indigo ปรากฏเฉพาะ: ปุ่มหลัก 1 ปุ่มต่อพื้นที่, ลิงก์, แถบเมนู active, ค่าความคืบหน้า, โฟกัส, ตัวนับ — ที่เหลือเป็นเทา/ขาว/ดำ
- ตัวอักษรตระกูลเดียว (IBM Plex Sans Thai Looped), หัวข้อ 600 ไม่ใช่ตัวหนาจัด, ลำดับชั้นด้วยขนาด+น้ำหนัก+สีเทา
- ไอคอนเส้น Lucide 1.75px ขนาด 16/20 สีเทา (`text-muted-foreground`) ยกเว้นไอคอนสถานะที่ใช้สีสถานะ
- โหมดมืด: พื้นเกือบดำ `#09090B`, การ์ด `#18181B`, ขอบ `#27272A`, indigo สว่างขึ้น (`#818CF8`) ปุ่มหลักตัวเข้ม

## §H Hook class ที่ต้องคง (allowlist — **27 ชื่อ**; class `aq-*` อื่นต้องไม่เหลือหลัง S6)
| กลุ่ม | ชื่อ | ใช้กับ | มีสไตล์? |
|---|---|---|---|
| เทสต์ผูกตรง | `aq-skip` | `<a>` skip link ใน AppShell (+ AuthLayout ถ้ามีเดิม) | มี (§T10) |
| | `aq-count` | ตัวนับบนเมนู sidebar (badge "รอท่าน") | มี |
| | `aq-textarea--prose` | textarea narrative TH/EN ใน SarWorkspace | ไม่มี (hook) |
| | `aq-chart-label` | `<text>` ป้ายใน TrendChart | มี |
| target audit | `aq-btn` | **ใส่อัตโนมัติใน base ของ Button cva** (ทั้ง `<button>` และ `<a>` ผ่าน `asChild`) | ไม่มี |
| | `aq-btn-compact` | ใส่อัตโนมัติใน size `compact` | ไม่มี |
| | `aq-nav-item` | `<a>` เมนูใน sidebar | ไม่มี |
| | `aq-term__btn` | ปุ่ม (?) ของ Term | ไม่มี |
| | `aq-chip__remove` | ปุ่ม × ของ chip ใน RequirementPicker | ไม่มี |
| | `aq-matrix` | wrapper ตาราง matrix หลักสูตร (select ระดับ 40px ที่ ≥1024) | ไม่มี |
| role XS (13px) | `aq-pill`, `aq-badge`, `aq-heat-cell__label`, `aq-kbd` (+ `aq-count`, `aq-chart-label` ข้างบน) | ป้ายสั้น ≤3 คำ | มี |
| role SM (14px) | `aq-help`, `aq-meta`, `aq-crumbs`, `aq-btn-reason`, `aq-field-error`, `aq-saved`, `aq-nav-group`, `aq-kpi__label`, `aq-step__meta`, `aq-legend`, `aq-progress__label`, `aq-term__body`, `aq-heat-label` | ข้อความรอง | มี |
id ที่ต้องคง: `#app-sidebar` (+ class `is-open` ตอนเปิด), `#main` (`tabIndex=-1`) · class อื่นที่ไม่ขึ้นต้น `aq-` ที่ใช้เป็น hook: `is-open` (sidebar), `celebrate-spark` (L7)
กฎ: element ที่ข้อความต้องเป็น 13/14px **ต้อง** อยู่ใน (หรือเป็น) role class — ห้ามใช้ `text-xs`/`text-sm` ลอย ๆ นอก role class (size audit จะจับเป็น <16px) ยกเว้น `th`, `caption`, `figcaption`

## §C Component recipe (ของเดิม → หน้าตาใหม่)

### C1 Button — `components/ui/primitives/button.tsx` (shadcn button + cva)
- base: `aq-btn inline-flex items-center justify-center gap-2 rounded-md text-base font-medium text-center no-underline transition-colors duration-fast ease-hover [&_svg]:shrink-0 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent disabled:shadow-none aria-disabled:…(เหมือน disabled)` — **ไม่มี `whitespace-nowrap`** (ข้อความไทยยาวต้องตัดบรรทัดได้ ไม่ดันหน้าจอล้น) · ไม่มี ring/outline-none · ไม่มี opacity
- variant (map จากของเดิม):
  | ใหม่ | class | เดิม |
  |---|---|---|
  | `default` | `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90` | `aq-btn-primary` |
  | `outline` | `border border-input bg-card text-foreground hover:bg-accent` | `aq-btn` (secondary) |
  | `ghost` | `text-foreground hover:bg-accent` | `aq-btn-ghost` |
  | `destructive` | `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90` | `aq-btn-danger-solid` |
  | `destructiveOutline` | `border border-destructive bg-card text-destructive hover:bg-destructive-muted` | `aq-btn-danger` |
  ไม่มี variant `link` (ปุ่มต้อง ≥44) — ลิงก์ในประโยคใช้ `<a>`/`<Link>` ธรรมดา
- size: `default` `min-h-11 px-4 py-2` · `compact` `aq-btn-compact min-h-11 lg:min-h-10 px-3 py-1.5` · `icon` `h-11 w-11 p-0` (ต้องมี `aria-label`)
- ลิงก์ที่หน้าตาเป็นปุ่ม: `<Button asChild variant=… ><Link …/></Button>`
- `AsyncButton` (common.tsx): Button + `aria-busy` + Icon `loader` `animate-spin` แทนไอคอนหน้า + `busyText` เดิม
- ปุ่ม "เหตุผลที่กดไม่ได้" (`aq-btn-reason`) อยู่ใต้ปุ่ม เป็น `<p className="aq-btn-reason">`

### C2 Form
- Label: `<label className="text-base font-medium">` · ดอกจัน required `<span className="text-destructive">*</span>` ตามเดิม
- Input `primitives/input.tsx`: `flex min-h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground read-only:bg-muted disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-destructive transition-colors`
- Textarea `primitives/textarea.tsx`: เหมือน Input + `min-h-24 py-2.5` · narrative: เพิ่ม `aq-textarea--prose min-h-[24rem] leading-[1.75]` (attribute `hidden` สลับ TH/EN ตามเดิม — **ห้ามใส่ `block`/`flex`** บน textarea นี้)
- NativeSelect `primitives/native-select.tsx` (เขียนเอง ตามหน้าตา shadcn native-select): `<div className="relative min-w-0">` + `<select className="peer min-h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-card pl-3 pr-10 text-base text-foreground disabled:bg-muted …">` + `<Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />` · **testid/label/`aria-*` อยู่บน `<select>` เสมอ** (forwardRef ไปที่ select) · `option` ไม่ต้องจัดสไตล์ (ใช้ native; `color-scheme` จาก next-themes ทำให้ dropdown มืดเองใน dark)
- Checkbox/radio: native `h-5 w-5 shrink-0 accent-primary` อยู่ใน `<label className="flex min-h-11 items-center gap-3">`
- File/dropzone: `rounded-lg border-2 border-dashed border-input bg-muted/40 p-6 text-center hover:bg-muted` + `<input type=file>` โปร่งใสทับเหมือนเดิม (`opacity-0` — เทสต์ยกเว้นไว้แล้ว)
- โครง field: `<div className="space-y-1.5">` label → control → `aq-help` → `aq-field-error` (ไอคอน `x-circle` 16 + ข้อความ "ข้อผิดพลาด: …" ตามเดิม) · ระหว่าง field `space-y-5` · error summary = Alert destructive บนสุดของฟอร์ม
- `<details>` (collapse/accordion/import-panel): `rounded-lg border bg-card` · `<summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">` + chevron หมุน `group-open:rotate-180` (ใส่ `group` ที่ details) · เนื้อหา `border-t p-4`

### C3 Card — `primitives/card.tsx`
`Card`: `rounded-lg border bg-card text-card-foreground shadow-sm dark:shadow-none` · `CardHeader`: `flex flex-col gap-1.5 p-4 md:p-6` · `CardTitle`: **ใช้ heading ตามระดับเดิมในหน้า** (`<h2>`/`<h3>` ผ่าน prop `as`) `text-lg font-semibold` · `CardDescription`: `<p>` `text-base text-muted-foreground` · `CardContent`: `p-4 pt-0 md:p-6 md:pt-0` · `CardFooter`: `flex flex-wrap items-center gap-2 p-4 pt-0 md:p-6 md:pt-0`
การ์ดที่กดได้ทั้งใบ (`aq-card--link` เดิม): `<Link>` เป็นตัวการ์ด + `no-underline text-foreground transition-colors hover:border-input hover:shadow-sm` (ไม่ยก)

### C4 Badge / Status pill — `primitives/badge.tsx` + `lib/ui/tone.ts`
`aq-badge inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium` + ไอคอน 14 (ตาม `TONE_ICON` เดิม — สถานะ = สี+ไอคอน+ข้อความ เสมอ)
`lib/ui/tone.ts` (literal ทั้งหมด — ห้ามประกอบ string):
```ts
export const TONE_SOFT: Record<Tone, string> = {
  ok: 'bg-success-muted text-success', warn: 'bg-warning-muted text-warning', bad: 'bg-destructive-muted text-destructive',
  info: 'bg-info-muted text-info', primary: 'bg-primary-muted text-primary', neutral: 'bg-muted text-muted-foreground',
};
export const TONE_TEXT: Record<Tone, string> = { ok: 'text-success', warn: 'text-warning', bad: 'text-destructive', info: 'text-info', primary: 'text-primary', neutral: 'text-muted-foreground' };
export const MSG_TONE: Record<MsgTone, { box: string; icon: string }> = { /* success/warn/danger/info/neutral → border-*/30 bg-*-muted + text-* */ };
export const HEAT_CLASS: Record<HeatLevel, string> = {
  empty: 'border-dashed border-input bg-muted text-muted-foreground', critical: 'border-transparent bg-destructive-muted text-destructive',
  warning: 'border-transparent bg-warning-muted text-warning', ok: 'border-transparent bg-primary-muted text-primary',
  ready: 'border-transparent bg-info-muted text-info', approved: 'border-transparent bg-success-muted text-success',
};
export const MATRIX_LEVEL: Record<'I'|'R'|'M', string> = { I: 'bg-primary-muted text-foreground', R: 'bg-info-muted text-info', M: 'bg-primary text-primary-foreground' };
```
`Tone`/`MsgTone`/`HeatLevel` import type จาก `lib/ui/status.ts`/`common.tsx`/`lib/types` (ถ้า `MsgTone` อยู่ใน common.tsx ให้ย้าย type ไป `lib/ui/tone.ts` แล้ว re-export จาก common.tsx ใน S1)

### C5 Table — `primitives/table.tsx`
wrapper `relative w-full overflow-x-auto rounded-lg border bg-card` · `table` `w-full caption-bottom text-base` · `thead tr` `bg-muted/60` · `th` `h-11 px-4 text-left align-middle text-sm font-medium text-muted-foreground` · `td` `px-4 py-3 align-top` · แถว `border-t hover:bg-muted/40` · แถวเลือก/ไฮไลต์ `bg-primary-muted` · คอลัมน์ sticky ซ้ายเดิม `sticky left-0 bg-card` · ตัวเลข `text-right tabular-nums`
มือถือ (<768, ตารางที่เดิมมี `aq-table--stack`): ทุก `tr` เป็นการ์ดย่อย `max-md:block max-md:border-t max-md:p-4`, `thead` → `max-md:sr-only`, `td` → `max-md:block max-md:px-0 max-md:py-1` + ป้ายจาก `data-label` ด้วย `max-md:before:block max-md:before:text-sm max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]` — **ลำดับคอลัมน์/`<strong>` รหัสในคอลัมน์แรกคงเดิม**

### C6 PageHeader (common.tsx)
```
nav.aq-crumbs   หน้าหลัก  ›  รอบประเมิน  ›  2569                       (text-sm muted, ลิงก์ hover:text-foreground)
┌──────────────────────────────────────────────────────────────────────┐
│ h1 text-2xl font-semibold  [status badge]          [ปุ่มรอง] [ปุ่มหลัก] │  md:flex-row md:items-end justify-between gap-4
│ sub: text-base text-muted-foreground max-w-[46rem]                    │  actions flex-wrap gap-2
└──────────────────────────────────────────────────────────────────────┘  mb-6 (ไม่มีเส้นใต้)
```

### C7 InlineMessage (Alert)
`flex gap-3 rounded-lg border p-4` + `MSG_TONE[tone].box` · ไอคอน 20 สี `MSG_TONE[tone].icon` · title `font-medium text-foreground` · เนื้อ `text-base text-foreground` (คู่ #30–33) · ข้อความรอง `aq-meta` (คู่ #34–37) · actions `mt-3 flex flex-wrap gap-2` · ปุ่มปิด ghost icon · role alert/status ตามเดิม · `large` = `p-5 text-lg title`

### C8 KPI tile
การ์ด `p-4 md:p-5` · `aq-kpi__label` บน · ค่า `text-3xl font-semibold tabular-nums text-foreground` (ไม่ใช้สี primary เป็นตัวเลขหลักอีก — ตัวเลขดำ อ่านง่ายกว่า) · บรรทัดล่าง `aq-meta` + ไอคอนสถานะสี · KPI ที่กดได้ (`button.aq-kpi` เดิม) = `<button>` ทั้งใบ `text-left hover:border-input` · `kpi-summary` = InlineMessage warn/success ตามเดิม

### C9 Heatmap cell (`cycles/[id]`)
`<a data-testid="heat-{id}">` `relative flex min-h-[4.25rem] min-w-[4.75rem] max-sm:min-h-16 max-sm:min-w-[4.25rem] flex-col justify-center rounded-md border px-2 py-1.5 no-underline transition-colors hover:border-foreground/30` + `HEAT_CLASS[level]` · รหัสข้อ `text-base font-semibold tabular-nums` · ป้าย `aq-heat-cell__label` (2 บรรทัดได้) · ไอคอนสถานะข้อ 14 `absolute right-1.5 top-1.5` · **ไม่เลื่อน/ไม่ยก** · grid `grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1.5` · `aq-heat-label` หัวแถวเกณฑ์ · legend `aq-legend`

### C10 Progress ring / bar / Stepper
- Ring: track `stroke-muted`, ค่า `stroke-primary` (ครบ + ไม่มีวิกฤต → `stroke-success`) · ตัวเลขกลาง `text-xl font-semibold tabular-nums` · `aq-progress__label` ใต้ · ห้ามใช้สีอื่นเป็นแท่งค่า
- Bar: `h-2 w-full overflow-hidden rounded-full bg-muted` → `h-full origin-left bg-primary transition-transform duration-progress ease-move` (`scaleX`)
- Stepper: วง `flex h-8 w-8 items-center justify-center rounded-full border-2` ตัวเลขในวงเป็น `<span className="aq-step__meta">` (14px — อยู่ใน role class) · done `border-primary bg-primary text-primary-foreground` (+ check) · current `border-primary bg-card text-primary` · todo `border-input bg-card text-muted-foreground` · เส้นเชื่อม `h-0.5 bg-border` → done `bg-primary` (L8 scaleX) · ชื่อขั้น `text-base font-medium`, meta `aq-step__meta`

### C11 Tabs (คง `button[role=tab]` เดิม)
- แบบเส้นใต้ (หน้า/เนื้อหาหลัก: curriculum, admin, TH/EN ใน editor): tablist `flex flex-wrap gap-1 border-b` · tab `-mb-px min-h-11 border-b-2 border-transparent px-3 text-base font-medium text-muted-foreground hover:text-foreground aria-selected:border-primary aria-selected:text-foreground`
- แบบ segmented (แผงข้าง SAR, ตัวเลือกเล็ก): tablist `inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1` · tab `min-h-11 rounded-md px-3 text-base font-medium text-muted-foreground aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-sm`
- ใช้ร่วมกับ FontScaleSeg / ThemeSegment / LangToggle (role radiogroup/aria-pressed ตามเดิม ใช้ `aria-checked:`/`aria-pressed:` แทน `aria-selected:`)

### C12 Dialog (คง `DialogContext` logic/API/role/aria-modal/focus trap/ชื่อปุ่มทั้งหมด)
- ฉาก: `fixed inset-0 z-dialog flex items-center justify-center overflow-y-auto bg-black/50 p-4 animate-fade-in dark:bg-black/70` (จัดกลางด้วย flex — **ห้าม translate จัดกลาง** เพราะ keyframe `dialog-in` ใช้ transform)
- กล่อง `role="dialog"`: `w-full max-w-lg rounded-lg border bg-popover p-6 text-popover-foreground shadow-lg animate-dialog-in dark:shadow-none max-h-[90vh] overflow-y-auto`
- หัว: ไอคอนตาม variant ในวง `h-10 w-10 rounded-full` (danger: `bg-destructive-muted text-destructive`, warning: `bg-warning-muted text-warning`, info: `bg-info-muted text-info`) + title `text-lg font-semibold` · ข้อความ `mt-2 text-base text-muted-foreground`
- prompt: Textarea recipe (`dlg.locator('textarea')` ยังเจอ)
- ท้าย: `mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` · ยกเลิก = outline · ยืนยัน = default (danger → destructive)

### C13 Toast (คง `ToastContext` + `components/ui/Toast.tsx`)
คอนเทนเนอร์ `fixed inset-x-4 bottom-4 z-toast flex flex-col gap-2 sm:left-auto sm:w-[24rem]` (`aria-live` เดิม) · ชิ้น `data-testid="toast"`: `relative overflow-hidden rounded-lg border bg-popover p-4 pr-12 shadow-lg animate-toast-in dark:shadow-none` · ไอคอนสถานะ 20 + `TONE_TEXT` · ข้อความ `text-base` · ปุ่ม action = Button outline compact · ปิด = ghost icon มุมขวาบน · แถบเวลา `absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary animate-toast-time` (duration inline เดิม) · ออก `animate-toast-out`

### C14 Popover (Term, DisplayPrefs — คง logic เดิม)
แผง `absolute z-toast mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg animate-pop-in dark:shadow-none` · Term ปุ่ม `aq-term__btn inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground` · เนื้อ `aq-term__body`
DisplayPrefs: หัว "การแสดงผล" `font-medium` · ขนาดตัวอักษร (FontScaleSeg segmented) · **ธีม (ThemeSegment ใหม่: สว่าง / มืด / ตามระบบ, role=radiogroup)** · สวิตช์เอฟเฟกต์ (checkbox native) — แต่ละแถว `space-y-2`, คั่น `border-t pt-3`

### C15 Empty / Loading / Error / AppLoader
```
Empty (state-empty)                          Loading (state-loading, หลัง 300ms)
┌ border-dashed rounded-lg bg-card ───────┐   ┌ การ์ด ───────────────────────┐
│              (◯ icon 24)                │   │ ▒▒▒▒▒▒▒▒▒▒░░░░   (animate-pulse│
│   h-12 w-12 rounded-full bg-muted        │   │ ▒▒▒▒▒▒▒░░░░░░░    rounded-md   │
│      หัวข้อ  text-lg font-semibold        │   │ ▒▒▒▒▒▒▒▒▒▒▒▒░░    bg-muted)    │
│  คำอธิบาย text-muted-foreground max-w-md │   └───────────────────────────────┘
│            [ปุ่มทำต่อ (ถ้ามี)]             │   โครง skeleton 5 แบบเดิม (cards/table/editor/dashboard/form)
└──────────────── px-6 py-12 text-center ─┘
```
- ภาพเส้น SVG เดิม (L12) ใช้ได้ สี `text-muted-foreground` (`currentColor`) ขนาดไม่เกิน 96px
- ErrorBox (`state-error`) = InlineMessage danger + รหัส `aq-meta font-mono` + ปุ่ม "ลองใหม่" outline
- AppLoader (`app-loader`, `data-mode` เดิม): `fixed inset-0 z-loader flex flex-col items-center justify-center gap-4 bg-background` · BrandMark · วง SVG 40px track `stroke-muted` + arc 25% `stroke-primary animate-spin` · ข้อความ `text-muted-foreground` · reduced-motion: arc ซ่อน (`motion-reduce:hidden`) เหลือข้อความ "…"

### C16 BrandMark / Icon / LangToggle / ThemeToggle
- BrandMark: โลโก้ `h-8 w-8 rounded-md bg-primary text-primary-foreground` + glyph SVG เดิม (currentColor) · wordmark `font-semibold text-foreground` ข้อความเดิม · ไม่มีสี accent อื่น
- Icon.tsx: คง API `name/size/label` · `strokeWidth={1.75}` · `className` ต่อท้าย · **ต้องมี `inline-block shrink-0 align-[-0.125em]`** ใน base class (กัน preflight ทำ svg เป็น block ใน S6) · เพิ่มชื่อ `sun`, `moon`, `monitor`, `chevron-down` (ถ้ายังไม่มี), `loader` (ถ้ายังไม่มี) จาก Lucide (ISC)
- LangToggle: segmented `inline-flex rounded-md border border-input p-0.5` · ปุ่ม `min-h-11 min-w-11 rounded-sm px-3 text-base font-medium text-muted-foreground aria-pressed:bg-accent aria-pressed:text-foreground`
- ThemeToggle (ใหม่ S0, `components/ui/ThemeToggle.tsx`): (ก) `ThemeToggleButton` = Button ghost icon สลับ light↔dark (ไอคอน moon/sun, `aria-label` "สลับเป็นธีมมืด"/"สลับเป็นธีมสว่าง") (ข) `ThemeSegment` = radiogroup 3 ค่า "สว่าง"/"มืด"/"ตามระบบ" (ไอคอน sun/moon/monitor + ข้อความ) · ทั้งสองแสดง placeholder ขนาดเท่ากันจน mounted

### C17 RequirementPicker (คง logic/testid)
ช่องค้น = Input recipe · listbox `absolute z-toast mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-lg` · option `flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-base aria-selected:bg-accent` (รหัส `font-medium tabular-nums` + ชื่อ `text-muted-foreground`) · chip `inline-flex items-center gap-1 rounded-md bg-primary-muted pl-2.5 text-base text-primary` + `aq-chip__remove h-8 w-8 rounded-md hover:bg-primary/10`

## §P หน้าตาต่อหน้า (เนื้อหา/ลำดับตาม `ui/pages.md` P1–P21)

### P1 Landing `/`
```
┌ LandingNav  sticky top-0 border-b bg-background/80 backdrop-blur ─────────────────────────────┐
│ [▣] AUN-QA Copilot      ฟีเจอร์  ขั้นตอน  ความน่าเชื่อถือ       [TH|EN] [☾] [เข้าสู่ระบบ(outline)]│ h-16, max-w-screen-xl px-4 md:px-6
└────────────────────────────────────────────────────────────────────────────────────────────────┘  มือถือ: ลิงก์ซ่อนใน disclosure เดิม
                (พื้น hero: ลายตาราง 1px สี border จางลงด้วย mask radial — CSS ล้วน, ตกแต่ง)
                       ( ◦ badge outline: ข้อความ tag เดิม )
              h1 text-4xl lg:text-5xl font-semibold text-center max-w-3xl
                p text-lg text-muted-foreground text-center max-w-2xl
                  [เริ่มใช้งาน → (default, hero-start)]  [ดูขั้นตอน (outline)]
     ┌ "ภาพผลิตภัณฑ์" = การ์ด rounded-xl border bg-card shadow-sm: เนื้อหา illustration/ring เดิมของ hero ┐
     └───────────────────────────────────────────────────────────────────────────────────────────────┘
 About/Features: h2 text-3xl กลาง + grid sm:2 lg:3 การ์ด (ไอคอนในกล่อง h-10 w-10 rounded-md border bg-muted, h3 text-lg, p muted)
 Flow: ลำดับขั้นเป็น Stepper แนวนอน ≥1024 / แนวตั้ง <1024 (วงตัวเลข outline)
 Trust: 2 คอลัมน์ ≥768: ข้อความซ้าย + รายการ check ขวาในการ์ด
 CTA: การ์ดกว้าง rounded-xl border bg-card p-8 md:p-12 text-center (ไม่ใช่แถบสีเข้ม) + ปุ่ม default
 Footer: border-t py-8 text-muted-foreground, ลิงก์ hover:text-foreground
```
section เว้น `py-16 md:py-24` · L1b hero fade-up คงไว้

### P2 Login `/login`
```
≥1024: grid 2 คอลัมน์ (lg:grid-cols-2) เต็มจอ            <1024: คอลัมน์เดียว ฟอร์มก่อน แผงแบรนด์ซ่อน (ข้อความสั้นอยู่ใต้ BrandMark)
┌──────────────────────────────┬──────────────────────────────────┐
│ [▣ AUN-QA Copilot]   [ก ก+ ก++][TH|EN][☾] ← tools มุมขวาบนของคอลัมน์ฟอร์ม
│                              │  bg-muted border-l                │
│   ┌ form max-w-sm ─────────┐ │   h2 text-2xl (หัวข้อแบรนด์เดิม)   │
│   │ h1 text-2xl "เข้าสู่ระบบ"│ │   รายการ ✓ จุดเด่นเดิม 3 ข้อ        │
│   │ p muted                 │ │   (ไอคอน check สี primary)          │
│   │ [login-reason alert]    │ │   ภาพเส้น SVG เดิม (currentColor)   │
│   │ label/ input username   │ │                                   │
│   │ label/ input password   │ │                                   │
│   │ [เข้าสู่ระบบ — full w]   │ │                                   │
│   │ ▸ บัญชีทดสอบ (details)   │ │                                   │
│   └─────────────────────────┘ │                                   │
└──────────────────────────────┴──────────────────────────────────┘
```
ไม่มีพื้นสีเข้ม (ยกเลิก `aq-on-dark`) · ปุ่มเข้าสู่ระบบ `w-full` · login-fontscale คงไว้ใน tools

### P3 AppLoader — C15 · P20 404 — `NotFoundView`: กลางจอ, ตัวเลข "404" `text-5xl font-semibold text-muted-foreground tabular-nums`, h1 text-2xl, ปุ่ม default "กลับหน้าหลัก" + outline ตามเดิม · P21 no-access = Empty

### P4 AppShell
```
≥1024                                                    <1024: sidebar เป็น drawer (#app-sidebar.is-open)
┌ #app-sidebar w-sidebar border-r bg-background ┬ topbar sticky top-0 z-topbar h-14 border-b bg-background/80 backdrop-blur ┐
│ [▣] AUN-QA Copilot          (h-14 px-4)        │ [☰ nav-menu <1024] [▣ <1024]          [TH|EN][☾][🔔 nav-bell][(AB) ชื่อ/บทบาท] │
│                                                ├──────────────────────────────────────────────────────────────────┤
│ aq-nav-group "งานของฉัน"                        │ <main id="main"> max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-8 │
│ ▍⌂ หน้าหลัก                         (3)          │   readonly-banner / session-lost (InlineMessage, sticky ใต้ topbar)       │
│  ✓ รอตรวจ                           (2)          │   PageHeader                                                       │
│ aq-nav-group "จัดทำรายงาน (SAR)"                 │   เนื้อหา                                                           │
│  ◷ รอบประเมิน                                    │                                                                   │
│  …                                               │                                                                   │
│ ─────────── (sticky bottom, border-t p-3)        │                                                                   │
│  [⚙ การแสดงผล ▸ popover] [⎋ ออกจากระบบ]          │                                                                   │
└────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘
```
- nav item `aq-nav-item relative flex min-h-11 items-center gap-3 rounded-md px-3 text-base text-foreground no-underline hover:bg-accent` · ไอคอน 20 `text-muted-foreground` · active (`aria-current=page`): `bg-accent font-medium` + แถบซ้าย `before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-primary` + ไอคอน `text-primary` · ตัวนับ `.aq-count` ชิดขวา (`ml-auto`)
- หัวกลุ่ม `aq-nav-group mt-5 px-3 pb-1` (ตัวแรก `mt-2`) — ไม่ uppercase
- drawer (<1024): `fixed inset-y-0 left-0 z-drawer flex w-[min(20rem,86vw)] flex-col border-r bg-background shadow-lg -translate-x-full invisible transition-transform duration-fast ease-exit [&.is-open]:visible [&.is-open]:translate-x-0 [&.is-open]:duration-base [&.is-open]:ease-enter lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:visible lg:translate-x-0 lg:shadow-none` + overlay `fixed inset-0 z-drawer bg-black/50 lg:hidden` (focus trap/Esc เดิม) · shell `lg:grid lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]`
- topbar: `is-scrolled` → `shadow-sm` · avatar `h-9 w-9 rounded-full bg-primary-muted text-primary font-medium` (ข้อความ initials 16px) · ชื่อ/บทบาทแสดง ≥768 (`nav-user` อยู่บน element เดิม) · ปุ่มทุกตัวเป็น ghost icon 44
- **ไม่มี** ช่องค้นหา/command palette

### P5 หน้าหลัก `/app`
```
PageHeader: h1 คำทักทายตามเวลา (L12) · sub วันที่ไทย
┌ การ์ด "สิ่งที่ต้องทำตอนนี้ (รวม N งาน)" ─────────────────────────────────────────┐
│ ┌ แถว todo (todo-<kind>-<n>) — divide-y ภายในการ์ด, ทั้งแถวไม่ใช่ลิงก์ ─────────┐ │
│ │ [ไอคอนในกล่อง h-9 w-9 rounded-md bg-muted]  titleTh (font-medium)          │ │
│ │                                             detailTh (aq-meta)  [badge เร่งด่วน warn] │
│ │                                                        [ไปทำ → (default compact)] │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
grid lg:grid-cols-3 gap-6:  [งานของฉัน — Table (mywork-table) lg:col-span-2]  [แจ้งเตือน (noti-list) — การ์ด รายการ divide-y, ยังไม่อ่าน = จุด primary 8px + font-medium]
```
แถว todo urgent: ขอบซ้าย `border-l-2 border-l-warning` (+ badge ข้อความ — ไม่พึ่งสี)

### P6 รายการรอบ `/app/cycles` — PageHeader + ปุ่ม `cycle-new` (default) · ฟอร์มสร้างเป็นการ์ด (C2) · ตาราง `cycles-table` (C5) คอลัมน์สถานะ = Badge + progress bar เล็ก `w-24`

### P7 แดชบอร์ดรอบ `/app/cycles/[id]`
```
PageHeader: h1 "รอบประเมิน 2569" [cycle-status badge]                      [อ่าน SAR (.docx) outline] [ปุ่ม transition default]
lock-banner (InlineMessage info + ไอคอน lock + hash font-mono)
KPI row: grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4  (C8)   + kpi-summary ใต้แถว
grid xl:grid-cols-[minmax(0,1fr)_22rem] gap-6
┌ การ์ด heatmap (heatmap) ───────────────────────────────┐ ┌ การ์ด "ขั้นตอนถัดไป" (cycle-actions) ┐
│ หัว: h2 + aq-legend (สี+ไอคอน+ข้อความ)                    │ │ ring ความพร้อม (C10)                 │
│ แต่ละเกณฑ์: aq-heat-label + grid ช่อง heat (C9)           │ │ "ตอนนี้รอ: …" aq-meta                │
└───────────────────────────────────────────────────────┘ │ preflight warnings (InlineMessage)  │
┌ การ์ด gap-list: toolbar (gap-filter native select)        │ │ ปุ่ม cycle-to-* (default/outline)   │
│ กลุ่ม <details> ต่อ severity, แถว divide-y                │ └────────────────────────────────────┘
└───────────────────────────────────────────────────────┘
```
L7 ฉลอง: ring success + `celebrate-spark` 8 จุดสี `fill-primary` (ไม่มี accent สีที่สองแล้ว)

### P8 มอบหมาย `/assign` — ตารางใหญ่ C5 ใน wrapper scroll, `owner-{id}`/due เป็น NativeSelect/Input compact (`min-h-11 lg:min-h-10` อยู่ในแถว) · แถบ bulk ด้านบนเป็นการ์ด toolbar `flex flex-wrap gap-2` · แถวที่เพิ่งบันทึก `animate-highlight`

### P9 SAR editor `/app/sections/[id]` (SarWorkspace)
```
PageHeader: crumbs › ข้อ 3.6 · h1 "ข้อ 3.6 …" [section-status]                         aq-saved "บันทึกแล้ว 10:42"
Stepper (C10) เต็มความกว้าง ใต้หัว
grid xl:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start
┌ การ์ด editor (sar-editor) ────────────────────────────┐ ┌ แผงข้าง sticky top-[calc(var(--topbar-h)+1rem)] ┐
│ tabs เส้นใต้: [ไทย tab-th] [English tab-en]  (C11)       │ │ tabs segmented: หลักฐาน | AI | ความเห็น | คะแนน | ประวัติ │
│ readonly-reason / R11 banner (InlineMessage)            │ │ (sidetab-*)                                   │
│ textarea narrative (aq-textarea--prose, leading 1.75,   │ │ เนื้อหาแผงในการ์ดย่อย / รายการ divide-y          │
│   min-h 24rem, ขอบ border-input, focus = outline กลาง)   │ │ linked-evidence: ul>li a strong รหัส          │
│ ตัวนับคำ aq-meta ชิดขวา                                  │ │ ai-draft / postcheck / rating-panel           │
└───────────────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
action bar: sticky bottom-0 z-sticky border-t bg-background/95 backdrop-blur py-3 — [save-manual outline] … [section-submit default] (ปุ่มอันตราย/ส่งกลับ แยกซ้าย ≥16px)
```
<1280: แผงข้างไปอยู่ใต้ editor (ไม่ sticky) · textarea ใช้ recipe C2 ปกติ (ขอบ `border-input` ≥3:1 — ไม่ทำแบบไร้ขอบ เพราะผู้ใช้ต้องเห็นขอบเขตช่องพิมพ์; WCAG 1.4.11)

### P10 คลังหลักฐาน `/app/evidence` + P11 รายละเอียด
```
PageHeader h1 "คลังหลักฐาน"                                                      [เพิ่มหลักฐาน + (ev-new, default)]
pii-banner (InlineMessage warn)
toolbar การ์ด: [🔍 ev-search Input w-full md:w-80] [ev-cycle NativeSelect] [ตัวกรองเพิ่มเติม details]
ฟอร์ม (ev-form) — การ์ดเปิดเหนือตาราง: grid md:grid-cols-2 gap-5: ev-title, ev-cycle(ปลายทาง) / ev-text (col-span-2) / dropzone ev-file (col-span-2) / RequirementPicker (col-span-2) → footer [ยกเลิก outline][ev-submit default]
ev-table (C5): รหัส <strong> (ฟอนต์หลัก tabular-nums ใน <a>) | ชื่อ | ข้อที่ผูก (badge) | สถานะ (Badge) | PII (badge bad) | วันที่ aq-meta
```
P11: PageHeader `{code} · {title}` + Badge · grid lg:grid-cols-3: การ์ดข้อมูล (dl `grid grid-cols-[8rem_1fr] gap-y-2`, dt `aq-meta`) lg:col-span-2 + การ์ดการกระทำ (verify/PII/AI) · ev-links รายการ chip · version เป็นตาราง

### P12 หลักสูตร `/app/curriculum` — tabs เส้นใต้ (C11) · ตาราง C5 · matrix ใน `aq-matrix` wrapper: ช่องระดับ = Badge `MATRIX_LEVEL` · prereq SVG สีเส้น `stroke-border`, โหนด `fill-card stroke-input`, ข้อความ `fill-foreground` (≥16px หรือ role class ตามเทสต์เดิม)
### P13 ตัวชี้วัด — การ์ดต่อ metric: หัว + TrendChart (`stroke-chart-1/2/4`, direct label `aq-chart-label`, กริด `stroke-border`) · import-panel `<details>` C2 · ตาราง cohort C5 (`td` 7 ช่องเดิม)
### P14 แผนปรับปรุง · P17 ส่งออก · P18 admin · P19 คลังเกณฑ์ — PageHeader + การ์ด/ตาราง ตาม C3/C5 · export: การ์ดต่อเอกสาร (ไอคอนไฟล์ในกล่อง muted + h3 + aq-meta + ปุ่ม outline "ดาวน์โหลด") grid md:2 · admin: tabs เส้นใต้ + ตารางผู้ใช้ + ฟอร์มผู้ใช้ในการ์ด · requirements: grid md:2 xl:3 ของ RequirementCard (การ์ด: รหัส badge primary + ชื่อ font-medium + คำอธิบาย muted, กดขยายด้วย details)
### P15 assess · P16 รอตรวจ — assess: tabs segmented เกณฑ์ (`assess-crit-{n}`) + การ์ดคะแนน (NativeSelect `crit-score`, Textarea `crit-why`, ปุ่ม `crit-save` default, `crit-next` outline) + แถบสรุป `rated-count` · review: ตารางคิว C5 + คอลัมน์สรุปเดิม, ปุ่ม `approve-*` default compact / ส่งกลับ destructiveOutline compact

## §M Motion — เปลี่ยนจาก ADR-UI-001 ข้อ 4 (ที่ไม่ระบุ = คงเดิม)
| เดิม | ใหม่ |
|---|---|
| L1 ปุ่มกด `translateY(1px)` + การ์ดยก `-2px` | **ไม่เคลื่อน**: ปุ่มเปลี่ยนสีพื้น 150ms · การ์ดเปลี่ยนขอบเป็น `border-input` + `shadow-sm` |
| L3 skeleton shimmer | `animate-pulse` (วนได้เฉพาะระหว่างโหลด — เหมือนเดิม) |
| L5 ไฮไลต์ `accent-tint` | `animate-highlight` จาก `primary-muted` → โปร่ง 1600ms |
| L7 ประกาย accent amber | ประกาย `fill-primary` class `celebrate-spark` (ซ่อนเมื่อ `data-effects="off"`) |
| ข้อห้าม 12 "ห้ามเพิ่ม dependency เพื่อ animation/ไอคอน/ฟอนต์" | คงไว้ — ฟอนต์ผ่าน `next/font` (ไม่ใช่ package), ไม่มี `tailwindcss-animate`/`lucide-react` |
| (ใหม่) สลับธีม | `disableTransitionOnChange` — ไม่มี transition สีตอนสลับ |

## §S ข้อความใหม่ (S0 เพิ่มใน `lib/i18n/dict-aunqa.ts` พร้อม EN)
| ไทย | EN | ที่ใช้ |
|---|---|---|
| ธีม | Theme | หัวแถวใน DisplayPrefs |
| สว่าง | Light | ThemeSegment |
| มืด | Dark | ThemeSegment |
| ตามระบบ | System | ThemeSegment |
| สลับเป็นธีมมืด | Switch to dark theme | aria-label ThemeToggleButton |
| สลับเป็นธีมสว่าง | Switch to light theme | aria-label ThemeToggleButton |
ไม่มีข้อความอื่นเปลี่ยน

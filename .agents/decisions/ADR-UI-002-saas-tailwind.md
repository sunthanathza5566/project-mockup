# ADR-UI-002 — Modern SaaS redesign บน Tailwind CSS 3.4 + shadcn/ui (React 18) + dark mode

- **สถานะ:** Proposed — รอเจ้าของอนุมัติ (TASK-0002 ขนาด L + เพิ่ม dependency หลัก)
- **วันที่:** 2026-10-25 · **ผู้เขียน:** architect · **งาน:** TASK-0002
- **แทนที่ (supersedes) บางส่วนของ ADR-UI-001:** ข้อ "Class/CSS = คง globals.css + prefix aq-", "Dark mode = ไม่ทำ" (T11), palette Indigo & Sand (T1), ฟอนต์ Sarabun (T2.1), radius/shadow/z-index/focus 3px (T5–T7, T9) และ AC-01/AC-09 ฉบับเดิม
- **ยังมีผลต่อ (ไม่เปลี่ยน):** พฤติกรรม/flow/ข้อความ/testid ทั้งหมดใน ADR-UI-001 ข้อ 6 + `ui/pages.md` (เนื้อหาและลำดับในหน้า), `ui/components.md` (state ที่ต้องมีของแต่ละ component), ข้อ 4 ลูกเล่น L1–L14 + ข้อห้าม 1–11 (ยกเว้นที่แก้ใน `ui/saas-spec.md` §M), ขนาดตัวอักษรขั้นต่ำ 13/14/16, target 44/40/32, breakpoint 480/768/1024/1280, ปรับขนาดตัวอักษร 100/112.5/125%
- **ไฟล์ประกอบ (มีผลบังคับเท่า ADR นี้):**
  - `ui/saas-tokens.md` — token HSL light/dark + ตาราง contrast ทุกคู่ + typescale + tailwind.config + โครง globals.css
  - `ui/saas-spec.md` — component recipe (ของเดิม → หน้าตาใหม่), รายการ hook class ที่ต้องคง, หน้าตาต่อหน้า (wireframe), motion
- **Study:** `.agents/research/standards/ui-ux.md` ข้อ 1.1 (rem, line-height ไทย 1.6–1.75, หัวข้อ ≥1.35, ไม่ใช้ letter-spacing กับไทย, ปรับขนาดตัวอักษร), 1.2 (R1: ผู้ใช้ไทยสูงวัยชอบฟอนต์มีหัว), 2 (target 44/40, focus ชัดเสมอ), 3 (AA + muted ≥4.5 ทุกพื้น, ห้าม #000/#FFF ขั้วสุด), 4.1 (สถานะ = สี+ไอคอน+ข้อความ), 4.3 (dark mode ต้องตรวจคู่ใหม่ทั้งหมด ห้ามกลับสีอัตโนมัติ) · research `TASK-0002.md` ทั้งไฟล์ · SYSTEM_MAP F1–F5

---

## บริบท
เจ้าของ (2026-10-25): "อยากให้สวยกว่านี้ ทันสมัยกว่านี้" — เลือก **Modern SaaS สะอาด** (แนว Linear/Notion/Vercel: พื้นขาว/เทาอ่อน, การ์ดขอบบาง 1px, sans ทั้งหมด, accent สีเดียว, มี light + dark), ขอบเขต **ทั้งระบบ**, stack **Tailwind + shadcn/ui** — เปลี่ยนเฉพาะ presentation ห้ามแตะ logic/data/AI, vitest + E2E เดิมต้องผ่าน (ปรับ selector ได้โดยไม่ลดสิ่งที่ทดสอบ)
ข้อจำกัดจริงที่ต้องอยู่ด้วย (ยืนยันแล้วจาก research/SYSTEM_MAP):
1. Next 14.2.35 + React 18.3.1 → shadcn ปัจจุบัน (`@latest`, Tailwind v4) สมมติ React 19 (ไม่มี forwardRef) → ใช้ไม่ได้ตรง ๆ
2. `shadcn@2.3.0` ดึงสีจาก `ui.shadcn.com/r` ที่ตอนนี้ส่ง oklch แต่ CLI ห่อด้วย `hsl()` → สีพัง
3. E2E พึ่ง native `<select>` (`selectOption` 16 จุด), `role=dialog` (14 จุด), `<details>/<summary>`, `hidden` attribute, `outline` จริง, ชื่อ class บางตัว (size/target audit), `#app-sidebar.is-open`
4. ผู้ใช้หลัก 30–60+ → ขนาดตัวอักษร/target/contrast ต้องคงมาตรฐานเดิม แม้ SaaS ทั่วไปจะใช้ 14px/36px

## ทางเลือกที่พิจารณา
| เรื่อง | ทางเลือก | ตัดสิน | เหตุผลย่อ |
|---|---|---|---|
| Stack | **A: Tailwind 3.4.19 + shadcn@2.3.0 (new-york, forwardRef)** / B: Next 15 + React 19 + Tailwind 4 / C: Tailwind 4 + React 18 แก้ component เอง | **A** | B เปลี่ยน framework = เกิน "presentation only" เสี่ยงทั้งระบบ · C งานมือมาก ไม่มีใครทดสอบ · A ไม่แตะ Next/React, component ตรง React 18 (research ข้อ 1) |
| วิธีได้ component shadcn | `shadcn init` / **เขียน config เอง + `add` จาก registry v3** / copy มือ | **ไม่รัน `init`**; เขียน `components.json` + `lib/ui/cn.ts` + token เอง แล้วใช้ `add` ผ่าน `REGISTRY_URL=https://v3.shadcn.com/r` (หรือ copy จาก registry JSON v3 ได้) | `init` เขียนทับ globals.css/tailwind.config และเสี่ยงกับดัก oklch; token เรากำหนดเองทั้งหมดอยู่แล้ว |
| ใช้ Radix primitive ไหน | ใช้ทุกตัวแบบ shadcn ปกติ / **ใช้เฉพาะตัวที่ไม่เปลี่ยน role/โครง DOM ที่เทสต์และ AppShell พึ่ง** | ใช้ **`@radix-ui/react-slot` ตัวเดียว** (Button `asChild`) | Select/Tabs/Dialog/AlertDialog/Popover/Checkbox/Toast ของ Radix เปลี่ยน role, portal, unmount content, aria-hidden นอก dialog → ชนเทสต์ 30+ จุด + ชน session-lost guard + dom-translate (SYSTEM_MAP F5 ข้อ 3–4). ได้ "หน้าตา shadcn" ด้วยการ restyle ของเดิมตาม recipe ใน saas-spec |
| Dark mode | ไม่ทำ / `prefers-color-scheme` อย่างเดียว / **next-themes 0.4.6 (`class`) + ปุ่มสลับ 3 ค่า** | next-themes | ไม่กระพริบ (inject script ก่อน paint), เลือกได้ สว่าง/มืด/ตามระบบ, ตรง shadcn (research ข้อ 3) |
| ฟอนต์ | Sarabun / Noto Sans Thai / Anuphan / Inter+ไทย / Geist+ไทย / **IBM Plex Sans Thai Looped** | **IBM Plex Sans Thai Looped 400/500/600 ผ่าน `next/font/google`** | ดูข้อ D4 |
| สี accent | indigo / blue / violet / teal | **indigo-600 `#4F46E5`** (dark: indigo-400 `#818CF8`) | ต่อเนื่องกับแบรนด์เดิม (indigo `#3B4FA0`) ผู้ใช้เดิมไม่ตกใจ · เป็นโทนที่ Linear/Vercel-style ใช้ · แยกจาก info (cyan) และ success (green) ชัดทั้ง hue และความสว่าง |
| Neutral | slate / **zinc** / gray / stone | **zinc** | เทากลางไม่อมฟ้า/น้ำตาล = "สะอาด" ตามโจทย์ · มีค่า HSL v3 ทางการ |
| ย้ายแบบไหน | big-bang / **ทีละโซน โดย CSS เดิมอยู่ร่วมช่วงเปลี่ยนผ่าน แล้ว cutover** | ทีละโซน | E2E รันได้ทุกขั้น จับ regression เร็ว, แตกงานขนานได้ |
| Icon | **คง `Icon.tsx` (path จาก Lucide) แค่ restyle + เพิ่มชื่อที่ต้องใช้** / ติดตั้ง lucide-react | คงเดิม | path เป็น Lucide อยู่แล้ว = หน้าตาเดียวกับ shadcn, ไม่เพิ่ม dependency |
| Chart | **คง TrendChart/ProgressRing/prereq SVG แล้วใช้สีจาก `--chart-*`** / shadcn chart (Recharts) | คงเดิม | พฤติกรรมเฉพาะ (direct label, tick, ไม่พึ่งสี) ผ่านเทสต์แล้ว · Recharts = dependency ใหญ่ ประโยชน์น้อย |
| Command palette (⌘K) | ทำ / **ไม่ทำ** | ไม่ทำ | เป็นฟีเจอร์ใหม่ที่เจ้าของไม่ได้ขอ + ต้องเพิ่ม `cmdk` → backlog |

## การตัดสินใจ

### D1. Stack + เวอร์ชัน (pin แบบ exact ใน `eduflow-next/package.json` ด้วย `--save-exact`)
| package | เวอร์ชัน | กลุ่ม | ใช้ทำอะไร | หลักฐาน |
|---|---|---|---|---|
| `tailwindcss` | **3.4.19** | dev | utility CSS (สาย v3-lts) | research ข้อ 1 [ยืนยัน] |
| `postcss` | ล่าสุดสาย `8` ณ วันติดตั้ง → บันทึกค่าที่ได้ใน Log | dev | pipeline ของ tailwind | Next 14 docs (research S5) — เวอร์ชันไม่ได้ verify |
| `autoprefixer` | ล่าสุดสาย `10.4` → บันทึกค่า | dev | prefix | เหมือนข้างบน |
| `clsx` | **2.1.1** | dep | `cn()` | research ทางเลือก A |
| `tailwind-merge` | **2.6.1** (dist-tag `tailwind-merge-2`) | dep | `cn()` — **ห้าม 3.x** (สาย Tailwind 4) | research ข้อ 1 [ยืนยัน] |
| `class-variance-authority` | **0.7.1** | dep | variant ของ Button/Badge | research ทางเลือก A |
| `next-themes` | **0.4.6** | dep | dark mode | research ข้อ 1/3 [ยืนยัน peer React 18] |
| `@radix-ui/react-slot` | เวอร์ชันที่ `shadcn@2.3.0 add button` ติดตั้ง (คาดสาย 1.x) → บันทึกค่า + ตรวจ peer ครอบ React 18 | dep | `asChild` ของ Button | ต้องตรวจตอนติดตั้ง |
**ห้ามติดตั้ง:** `shadcn@latest`, `tailwindcss@4`, `@tailwindcss/postcss`, `tailwind-merge@3`, `tailwindcss-animate` (ไม่จำเป็นเพราะไม่ใช้ Radix animation — keyframes เขียนใน config), `lucide-react`, `recharts`, `geist`, `sonner`, `cmdk`, `@radix-ui/*` ตัวอื่น · ไม่แตะ `next`, `react`, `react-dom`
CLI: ใช้ `npx shadcn@2.3.0 add ...` เท่านั้น โดยตั้ง env ก่อน (PowerShell: `$env:REGISTRY_URL="https://v3.shadcn.com/r"`) · หลังเพิ่มทุกครั้ง ตรวจ: grep `oklch` ทั้ง `eduflow-next/` (ไม่นับ node_modules) = 0, component ใช้ `React.forwardRef`, CLI ไม่ได้เขียนทับ `app/globals.css`/`tailwind.config.ts` (ถ้าเขียนทับ ให้ revert ส่วนนั้น)

### D2. ไฟล์ config ใหม่ (Config กลาง — architect ตัดสิน, frontend-dev สร้างใน S0)
- `eduflow-next/tailwind.config.ts`, `eduflow-next/postcss.config.mjs` (`{ plugins: { tailwindcss: {}, autoprefixer: {} } }`) — เนื้อหาตาม `ui/saas-tokens.md` §T9
- `eduflow-next/components.json`:
  ```json
  { "$schema": "https://ui.shadcn.com/schema.json", "style": "new-york", "rsc": true, "tsx": true,
    "tailwind": { "config": "tailwind.config.ts", "css": "app/globals.css", "baseColor": "zinc", "cssVariables": true, "prefix": "" },
    "aliases": { "components": "@/components", "utils": "@/lib/ui/cn", "ui": "@/components/ui/primitives", "lib": "@/lib/ui", "hooks": "@/lib/ui/hooks" },
    "iconLibrary": "none" }
  ```
  เหตุผล: `@/lib/utils` ชนโฟลเดอร์ `lib/utils/**` ของ backend (OWNERSHIP) → ใช้ `lib/ui/cn.ts` · ใส่ primitive ไว้ `components/ui/primitives/` (ตัวพิมพ์เล็กตาม shadcn) เพื่อไม่ชนชื่อไฟล์ PascalCase เดิมใน `components/ui/` บน Windows ที่ไม่แยกตัวพิมพ์ (เช่น `Toast.tsx`)
  ถ้า CLI 2.3.0 ไม่รับ key `iconLibrary` ให้ลบ key นั้น (ไม่มีผลกับเรา — ไม่ add component ที่ใช้ไอคอน)
- `lib/ui/cn.ts`: `export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }` — ใช้ `twMerge` ค่าเริ่ม (ชื่อขนาดตัวอักษรเป็นชื่อมาตรฐาน xs…5xl จึงแยกจากสีได้เอง) · **ห้ามเพิ่มชื่อ fontSize ใหม่** (เช่น `text-body`) ถ้าไม่ได้ `extendTailwindMerge` ให้รู้จัก ไม่งั้น `cn('text-body','text-destructive')` จะลบตัวใดตัวหนึ่ง
- `next.config.mjs`, `tsconfig.json`: **ไม่ต้องแก้**

### D3. Component: ใช้อะไร / ไม่ใช้อะไร
| ใช้ (add จาก registry v3 แล้วปรับตาม recipe ใน saas-spec §C) | ไม่ใช้ (เหตุผล) → ทำแทนด้วย |
|---|---|
| `button` (cva + Slot), `input`, `textarea`, `label` (เปลี่ยนเป็น `<label>` native — ไม่ใช้ `@radix-ui/react-label`), `card`, `badge`, `table`, `skeleton`, `alert`, `separator` (เป็น `<div role="none">`/`<hr>` — ไม่ใช้ `@radix-ui/react-separator`) | **Select** (Radix ≠ `<select>`, `selectOption` พัง) → `primitives/native-select.tsx` เขียนเองตามหน้าตา shadcn native-select (ห่อ `<select>` จริง + chevron) |
| | **AlertDialog** (`role=alertdialog` → `getByRole('dialog')` 14 จุดพัง) และ **Dialog ของ Radix** (aria-hidden นอก dialog + portal ชน session-lost/dom-translate) → **คง `DialogContext` เดิมทั้ง logic/API/role/ชื่อปุ่ม** restyle ตามหน้าตา shadcn Dialog |
| | **Toast/Sonner** → คง `ToastContext` + `Toast.tsx` เดิม restyle |
| | **Tabs (Radix)** (unmount เนื้อหาแท็บที่ปิด + เปลี่ยน keyboard model; `regress-u3fix` นับ textarea ที่ซ่อนด้วย `hidden`) → คง `button[role=tab]` เดิม restyle |
| | **Popover/Tooltip/DropdownMenu** (portal + hover-only) → คง `DisplayPrefs`/`Term` เดิม restyle |
| | **Checkbox/Switch/RadioGroup (Radix)** (role ไม่ใช่ input → `.check()` + session-lost guard พลาด) → native `<input type=checkbox|radio>` + `accent-color` |
| | **Sheet** (drawer) → คง `#app-sidebar` + `is-open` + focus trap เดิม |
| | **Command/Combobox** → คง `RequirementPicker` เดิม restyle |
| | **Chart** → คง SVG เดิม |
กติกาเมื่อ add: แทน `text-sm` เป็น `text-base` ในทุก element ที่เป็นเนื้อหา/ปุ่ม/ช่องกรอก/เซลล์ (AC-02 ≥16px); ลบ `focus-visible:ring-*`/`focus-visible:outline-none`/`focus:ring-*` ทั้งหมด (ใช้ outline กลางใน base); ลบ `disabled:opacity-50` (ใช้ token disabled ตาม recipe); `h-9`/`h-10` → `min-h-11` (compact = `min-h-11 lg:min-h-10`); ใส่ hook class ตาม saas-spec §H

### D4. ฟอนต์: **IBM Plex Sans Thai Looped** (400/500/600, subsets `thai`+`latin`, `display: 'swap'`, `variable: '--font-plex-thai'`) ผ่าน `next/font/google`
- **เหตุผล:** (1) ไทยแบบ "มีหัว" — หลักฐานเดียวที่มีน้ำหนัก (ui-ux 1.2 R1) ผู้ใช้ไทยสูงวัยอ่านไทยมีหัวสบายกว่า (2) ละตินในตัวคือ IBM Plex Sans = grotesque ร่วมสมัย ให้ความรู้สึก SaaS กับตัวเลข/อังกฤษ/รหัส (3) **ตระกูลเดียวครอบไทย+อังกฤษ** ไม่มีปัญหาความสูง/น้ำหนักไม่เข้ากันแบบ Inter+ฟอนต์ไทย (research อนุมานข้อ 89) (4) มีใน `font-data.json` ของ Next 14.2.35 (research ข้อ 4 [ยืนยัน]) ไม่ต้องเพิ่ม package (5) self-host ตอน build → เบราว์เซอร์ไม่เรียก Google (ดีกว่าเดิมเรื่อง privacy/ความเร็ว) (6) OFL ใช้ฟรี
- **ไม่เลือก:** Sarabun (ดู "ราชการ" ขัดโจทย์ SaaS), Noto Sans Thai/Anuphan (ไทยไม่มีหัว — สวยแบบ SaaS แต่ขัด R1 กับผู้ใช้ 50–60+), Inter/Geist + ไทย (สองตระกูล, Geist ไม่มีใน Next 14 ต้องเพิ่ม npm)
- **น้ำหนัก:** 400 เนื้อหา · 500 ปุ่ม/label/เมนู/ตัวเลข KPI รอง · 600 หัวข้อ/ตัวเลข KPI/`strong` — ไม่โหลด 700 (`font-synthesis: none` → ห้ามใช้ `font-bold`)
- mono (hash, รหัสไฟล์) = system stack `ui-monospace, SFMono-Regular, Consolas, monospace` (ไม่โหลดฟอนต์เพิ่ม)
- **ความเสี่ยง:** `next/font/google` ดาวน์โหลดตอน build → เครื่อง build ต้องออกเน็ตได้ (`playwright.config` build ทุกครั้ง). ถ้า build offline พัง frontend-dev **ได้รับอนุญาตล่วงหน้า** ให้เปลี่ยนเป็น `next/font/local` + ไฟล์ woff2 (OFL) ใน `eduflow-next/app/fonts/` โดยใช้ชื่อ family/variable เดิม — จด Log
- ui-inspector ต้อง render จริงก่อนปิด S2 (ด่าน V0): วรรณยุกต์ซ้อนไม่ถูกตัด, ตัวเลขในตาราง/KPI เรียงตรง (`tabular-nums`)

### D5. Design tokens → `ui/saas-tokens.md`
สรุปที่ล็อก: ตัวแปร shadcn รูปแบบ **HSL channel** (`--primary: 243.4 75.4% 58.6%`) ใน `:root` + `.dark` · Tailwind อ้างแบบ `hsl(var(--x) / <alpha-value>)` · neutral zinc, **brand accent = `--primary` (indigo) สีเดียว** (`--accent` ของ shadcn = พื้น hover สีเทา ไม่ใช่สีแบรนด์) · สถานะ success/warning/destructive/info มีคู่ `*-muted` (พื้นอ่อน) ทั้งสองธีม · contrast **38 คู่ × 2 ธีม ผ่าน AA ทุกคู่** (ข้อความ ≥4.5, UI ≥3) · radius `--radius: 0.5rem` · เงาบาง (การ์ด = เส้นขอบ 1px + `shadow-sm` เฉพาะ light) · control สูง ≥44px (compact 40 เฉพาะ ≥1024) · type scale rem + line-height ไทย (body 1.7, sm 1.6, หัวข้อ ≥1.35) · `html{font-size:var(--user-scale)}` คงเดิม · breakpoints 480/768/1024/1280 · focus = `outline 2px solid hsl(var(--ring))` offset 2px

### D6. กลยุทธ์ย้าย (ลำดับ + การอยู่ร่วม)
1. **S0 Foundation:** ติดตั้ง dep + config · ย้ายเนื้อหา `app/globals.css` เดิม **ทั้งไฟล์** ไป `app/legacy.css` (แก้ 1 บรรทัด: `--font-sans` → `var(--font-plex-thai), "Leelawadee UI", Tahoma, sans-serif`) · `app/globals.css` ใหม่ = Tailwind + token + base + hook/role class (saas-tokens §T10) · `layout.tsx` import `./legacy.css` **ก่อน** `./globals.css` (utility ของ Tailwind มาทีหลังจึงชนะ class เดิมที่ specificity เท่ากัน) · `corePlugins.preflight: false` + "mini-base" (box-sizing + border reset ที่ shadcn ต้องใช้) · next/font + ThemeProvider + ลบ `<link>` Google Fonts + ลบ `viewport.colorScheme:'light'` · `lib/ui/cn.ts`, `lib/ui/tone.ts`, primitives, ThemeToggle, คำแปลใหม่ทั้งหมด
2. **S1 shared components** ∥ **S2 shell + หน้า public** (ไฟล์ไม่ทับกัน) → **ด่าน V0** (ui-inspector ดูภาพ light/dark ของ shell/login/landing ก่อนลงทุนทำหน้าที่เหลือ — orchestrator ส่งภาพให้เจ้าของดูได้)
3. **S3 หน้างาน A** ∥ **S4 SAR+หลักฐาน** ∥ **S5 หน้าข้อมูล+admin** (ไฟล์ไม่ทับกัน)
4. **S6 Cutover:** ลบ `app/legacy.css` + import, เปิด preflight (ลบ `corePlugins`), ลบ mini-base ที่ซ้ำกับ preflight (เก็บ `[hidden]` !important), ไล่แก้ regression จาก preflight (svg `display:block` → Icon ต้องมี `inline-block`/`shrink-0`, list bullet, heading) ทุกไฟล์ frontend — **ทำคนเดียว ไม่ขนาน**
- **ระหว่างทาง:** หน้าที่ยังไม่ย้ายใช้ class เดิมจาก legacy.css ได้ (อาจดูไม่เข้าธีม/โหมดมืดเพี้ยน — ยอมรับ; ไม่ merge เข้า master จนจบ Phase 7) · ห้ามแก้ legacy.css ยกเว้นบรรทัดฟอนต์ใน S0 · component ที่ย้ายแล้ว **ห้ามมี class `aq-*` เหลือ** ยกเว้นรายการ hook (saas-spec §H)
- **class แบบ template string** (`aq-badge-${tone}`, `aq-heat-${level}`, `aq-lv-${v}`, `aq-msg--${tone}` ฯลฯ): **ห้ามประกอบชื่อ class Tailwind จาก string** — ใช้ object map ที่เขียน class เต็มเป็น literal (`lib/ui/tone.ts`, หรือ cva variants) เพื่อให้ JIT สแกนเจอ · **ไม่ใช้ safelist** (บวมและซ่อนบั๊ก) · ไฟล์ map อยู่ใน `content` ของ tailwind (`lib/ui/**`)
- ทุก subtask: `npx tsc --noEmit`, `npm test`, `npx next build`, `npm run e2e` ผ่านก่อน commit (E2E ล้มเพราะ markup → แก้ markup ไม่ใช่แก้เทสต์; ถ้าเทสต์ต้องเปลี่ยนจริง → HANDOFF REQUEST ถึง qa-tester ผ่าน TASK file)

### D7. กติกาคง selector ที่เทสต์ใช้ (ห้ามละเมิด)
1. **testid ทุกตัวเดิม** อยู่บน element บทบาทเดิม (รายการใน ADR-UI-001 7.3 + SYSTEM_MAP F3) · ข้อความไทยทุกข้อความเดิม (ไม่ปรับคำ) · หน้าละ `h1` เดียว · ปุ่มที่ไม่มีสิทธิ์ = ไม่ render
2. **element ชนิดเดิม:** native `<select>` ทุกตัว, `<textarea>` (narrative ซ่อนด้วย attribute `hidden` เหมือนเดิม — ห้ามใส่ utility `block`/`flex` บน element ที่ toggle ด้วย `hidden`; ถ้าต้องจัดวางให้ห่อด้วย div), `<details>/<summary>`, `<input type=file>`, `button[role=tab][aria-selected]`, dialog `role="dialog" aria-modal="true"`, `table > tbody > tr > td` ลำดับคอลัมน์เดิม, `<strong>` รหัสในคอลัมน์แรกของ `ev-table`, `ul > li a strong` ใน `linked-evidence`
3. **id/class hook ที่ต้องคง** (saas-spec §H — 27 ชื่อ): `#app-sidebar` (+ class `is-open`), `#main`, `a.aq-skip`, `.aq-count`, `textarea.aq-textarea--prose`, `text.aq-chart-label`, marker ของ target audit (`aq-btn`, `aq-btn-compact`, `aq-nav-item`, `aq-term__btn`, `aq-chip__remove`, `aq-matrix`) และ **typography role class** ของ size audit (XS 6 ตัว, SM 13 ตัว) — role class กลายเป็น component class ใน `@layer components` ที่ `@apply` ขนาด+สีจริง (ชื่อ = ความหมาย = ขนาด) จึง**ไม่ต้องแก้ size/target audit เลย**
4. **AppShell session-lost guard** ใช้ `closest('button, a, select, input, [role=button], [role=tab], summary, label')` — ห้ามสร้าง control ใหม่ที่ role อื่นนอกจากนี้ (สอดคล้อง D3 ที่ไม่ใช้ Radix)

### D8. เทสต์ที่ชนโจทย์ใหม่ — แก้อย่างไรโดยไม่ลดสิ่งที่ทดสอบ (qa-tester)
| เทสต์เดิม | ปัญหา | แก้เป็น (ความครอบคลุมเท่าเดิมหรือมากกว่า) |
|---|---|---|
| `tests/contrast.test.ts` hex 27 ตัวล็อก + 44 คู่ + กฎ `.aq-on-dark` | palette เปลี่ยน, รูปแบบเป็น HSL, มี 2 ธีม, ไม่มีแถบพื้นเข้มแล้ว | อ่าน `:root` และ `.dark` ใน `app/globals.css` (HSL channel → RGB → WCAG) · **ล็อกค่า HSL ทุก token ทั้งสองธีมตาม saas-tokens §T1** (แทนการล็อก hex) · token parity: ทุกตัวใน `:root` ต้องมีใน `.dark` · **ทุกคู่ใน §T2 (38 คู่) × 2 ธีม** ≥ เกณฑ์ และต่างจากตาราง ≤0.10 · กฎ CSS/TSX แทนกฎ on-dark: (ก) ไม่มี `oklch(` ใน globals.css (ข) grep `app/ components/` ไม่มี `text-primary` ซ้อนบน `bg-primary` ใน className เดียวกัน (ค) ไม่มี `opacity-50`/`disabled:opacity` ในไฟล์ tsx (disabled ห้ามซีดด้วย opacity — ADR-UI-001 เดิม) (ง) แท่งค่า progress ใช้ `primary`/`success` เท่านั้น (grep ใน ProgressRing/progress) |
| `e2e/ui-u.spec.ts` AC-09 Sarabun-only (`/^Sarabun\b/`, used = `['Sarabun']`) | ฟอนต์ใหม่ + next/font ตั้งชื่อ `__IBM_Plex_Sans_Thai_Looped_<hash>` และมี face `_Fallback_` | body font-family ตัวแรก normalize แล้ว (`/^__(.+?)(?:_Fallback)?_[0-9a-f]+$/` → แทน `_` ด้วยช่องว่าง) = `IBM Plex Sans Thai Looped` · `document.fonts.load('16px <ชื่อจริง>', 'ภาษาไทย')` ได้ face ≥1 และ loaded ทุกตัว · ชุด family ที่ loaded (normalize แล้ว) = `['IBM Plex Sans Thai Looped']` เท่านั้น (face Fallback เป็น `local()` ให้ normalize รวม) · **เพิ่ม:** ระหว่างโหลด 3 หน้า ไม่มี request ไป `fonts.googleapis.com`/`fonts.gstatic.com` · grep `app/ components/ context/` ไม่มี `Sarabun`, `fonts.googleapis`, `Cormorant`, `DM Sans` |
| AC-06 focus (outline ≥2px, contrast ≥3) | เดิมรันแค่ light | **คงเทสต์เดิมทุกบรรทัด** + เพิ่มรันชุดเดียวกัน (/login, /app, section editor) ใน dark (`page.emulateMedia({ colorScheme: 'dark' })` กับธีมค่าเริ่ม `system`) — เขียนใน Q0 เป็น `test.fixme` (ช่วงเปลี่ยนผ่านหน้าที่ยังใช้ legacy.css มีพื้นสว่างในโหมดมืด) แล้วเปิดใน Q1 หลัง cutover |
| `app/layout.tsx` light-only | ไม่มีเทสต์ตรง | **เพิ่ม** `e2e/theme.spec.ts`: (1) ตั้ง `localStorage.aunqa_theme='dark'` ด้วย `addInitScript` → ตอน `DOMContentLoaded` `<html>` มี class `dark` แล้ว (ไม่กระพริบ) และ body background = `hsl(--background)` ของ dark (2) สลับผ่าน UI แล้ว reload ค่ายังอยู่ (3) `system` ตาม `emulateMedia` (4) หลังสลับธีม `--user-scale` และ `data-effects` บน `<html>` ยังอยู่ (PrefsInit ไม่ชนกับ next-themes) (5) วน AC-03 (h-scroll) ที่ 1440+390 บน 5 หน้าใน dark |
| size audit (`XS_CLASSES`/`SM_CLASSES`) / target audit (`a.aq-btn`, `.aq-nav-item`, …) / `#app-sidebar.is-open` / `.aq-count` / `textarea.aq-textarea--prose` / `a.aq-skip` / `text.aq-chart-label` | — | **ไม่แก้** (คง hook ตาม D7.3) |
| **เพิ่มใหม่ (Q1 หลัง S6)** | — | grep: class `aq-*` ใน `app/ components/ context/ lib/ui/` ⊆ allowlist 27 ชื่อ · ไม่มีไฟล์ `app/legacy.css` · `tailwind.config.ts` ไม่มี `preflight: false` · ไม่มี `outline-none`/`focus-visible:ring`/`focus:ring` ใน tsx · ไม่มีค่า px ตายตัวกับขนาดตัวอักษร/ความสูง/line-height (`/\b(text|leading|h|min-h|max-h)-\[\d+(\.\d+)?px\]/`) · globals.css มี `[hidden]{display:none !important}` · component ใน `components/ui/primitives/` ใช้ `React.forwardRef` ทุกตัวที่รับ ref |
baseline: ก่อน S0 qa-tester รัน `npm test` + `npm run e2e` บันทึกจำนวน pass/skip ใน Log (= เกณฑ์ AC-11 "ไม่น้อยกว่าเดิม")

### D9. หน้าตาต่อส่วน → `ui/saas-spec.md` §P (landing, login, AppShell, หน้าหลัก, ตาราง, ฟอร์ม, แดชบอร์ดรอบ, SAR editor, หลักฐาน, empty/loading/error, dialog/toast, 404, AppLoader) — โครงเนื้อหา/ลำดับ/ข้อความยึด `ui/pages.md` เดิม เปลี่ยนเฉพาะ visual

## จุดที่ต้องให้เจ้าของอนุมัติ
1. **แผนทั้งหมด (งาน L)**
2. **เพิ่ม dependency หลัก 8 ตัว** (D1) — ไม่แตะ next/react
3. **เปลี่ยนฟอนต์ Sarabun → IBM Plex Sans Thai Looped** (ถ้าอยากให้ "SaaS จัด" กว่านี้ ทางเลือกคือ Noto Sans Thai แบบไม่มีหัว — แลกกับความอ่านง่ายของผู้ใช้สูงวัย)
4. ธีมเริ่มต้น = **ตามระบบ (system)** — ถ้าเจ้าของอยากให้เริ่มที่สว่างเสมอ เปลี่ยนค่าเดียว
5. build ต้องออกเน็ตได้ (โหลดฟอนต์ตอน build) — มีทางสำรอง local font ใน D4
- ไม่มี: deploy, migration/ลบข้อมูล, ค่าใช้จ่าย · key ใหม่ใน localStorage `aunqa_theme` (ไม่กระทบข้อมูลเดิม)

## ผลที่ตามมา
- (+) หน้าตา SaaS สะอาดทั้งระบบ, มี dark mode, token รวมศูนย์ทั้งสองธีม, เพิ่ม component ใหม่ภายหลังเร็วขึ้น (shadcn + Tailwind)
- (+) ฟอนต์ self-host — เบราว์เซอร์ไม่เรียก Google Fonts อีก
- (+) มาตรฐานผู้ใช้สูงวัยเดิมยังอยู่ครบ (16px, 44px, AA, ปรับขนาดตัวอักษร, reduced motion)
- (−) งาน L แตะทุกไฟล์ frontend (~1,000 จุดที่ใช้ class `aq-*`) · ช่วงเปลี่ยนผ่านหน้าที่ยังไม่ย้ายดูไม่เข้าธีม
- (−) ใช้ shadcn แบบ "หน้าตา" มากกว่า "Radix เต็มรูป" — component ซับซ้อน (Dialog/Popover/Tabs/Select) ยังเป็นของเขียนเอง ต้องดูแลเอง
- (−) อยู่บน Tailwind v3 / shadcn 2.3.0 (เอกสารเก่า) — วันที่ย้ายไป React 19/Next 15 ต้องย้ายเป็น Tailwind v4 อีกรอบ (token เป็น CSS variable จึงย้ายง่าย)
- (−) screenshot/diagram/บทในเล่มเรื่อง UI ล้าสมัย → ทำใหม่ตอนเฟส 8/10
